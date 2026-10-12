/**
 * 健澜科技 jlmedaios - 护理管理后台聚合器（排班 + NQI 指标，M16-B）
 *
 * 权限：nursing_admin:schedule 排班/请假；nursing_admin:indicator:view 只读；
 *       nursing_admin:indicator:enter 人工录入；nursing_admin:indicator:audit 全量。
 * DataScope：admin/护理部(dataScope=all)全量；普通护士/护士长按本病区科室过滤。
 * 排班为辅助建议、最终由护士长确认发布；异常指标须人工核实后方可上报。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { CareError } from './inpatientCareAggregator.js';
import * as repo from '../../db/repositories/nursingAdminRepo.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { validateSchedule, type ScheduleAssignment } from '../../medical-tools/nursing/scheduleRules.js';
import { computeIndicators, validateManualEntry } from '../../medical-tools/nursing/nqiIndicators.js';

export function forbidden(message: string): CareError {
  return new CareError(403, 'FORBIDDEN', message);
}

/** 返回当前 Auth 可见的病区 id 集合（DataScope） */
async function visibleWardIds(auth: AuthView): Promise<Set<string>> {
  const dept = auth.dataScope === 'all' ? null : auth.deptName;
  const wards = await repo.listWardsByDepartment(dept);
  return new Set(wards.map((w) => w.id));
}

function assertWardInScope(auth: AuthView, visible: Set<string>, wardId: string) {
  if (!visible.has(wardId)) {
    throw forbidden('该病区不在您的权限范围内');
  }
}

// ---------------------------------------------------------------------------
// 排班
// ---------------------------------------------------------------------------
export async function listScheduleBoard(auth: AuthView, opts: { from?: string; to?: string }) {
  const visible = await visibleWardIds(auth);
  const wards = await repo.listWardsByDepartment(auth.dataScope === 'all' ? null : auth.deptName);
  const schedules = await repo.listSchedules({ from: opts.from, to: opts.to });
  return {
    wards: wards.filter((w) => visible.has(w.id)),
    schedules: schedules.filter((s) => visible.has(s.wardId)),
  };
}

export async function listShiftOptions(auth: AuthView, wardId: string | null) {
  const visible = await visibleWardIds(auth);
  if (wardId) assertWardInScope(auth, visible, wardId);
  return { shifts: await repo.listShiftDefinitions(wardId) };
}

export async function assignShift(auth: AuthView, input: {
  wardId: string; date: string; nurseId: string; shiftId: string;
}) {
  const visible = await visibleWardIds(auth);
  assertWardInScope(auth, visible, input.wardId);
  const row = await repo.createSchedule({ ...input, createdBy: auth.id });

  // 实时合规校验（辅助提示，不阻断保存）
  const all = await repo.listSchedules({ wardId: input.wardId, from: input.date, to: input.date });
  const leaves = await repo.listLeave({ from: input.date, to: input.date });
  const leaveByNurse = new Map<string, Set<string>>();
  for (const l of leaves) {
    if (l.status !== 'approved') continue;
    const set = leaveByNurse.get(l.nurseId) ?? new Set<string>();
    set.add(l.leaveDate);
    leaveByNurse.set(l.nurseId, set);
  }
  const shifts = await repo.listShiftDefinitions(input.wardId);
  const shiftMap = new Map(shifts.map((s) => [s.id, s]));
  const assignments: ScheduleAssignment[] = all.map((s) => {
    const sd = shiftMap.get(s.shiftId);
    return {
      nurseId: s.nurseId, wardId: s.wardId, date: s.scheduleDate,
      shiftId: s.shiftId, shiftName: s.shiftName ?? '', hours: sd?.hours ?? 8, isNight: sd?.isNight ?? false,
    };
  });
  const check = validateSchedule(assignments, leaveByNurse, new Map());
  return { schedule: row, compliance: { compliant: check.compliant, violations: check.violations, summary: check.summary } };
}

export async function publishSchedule(auth: AuthView, input: { wardId: string; date: string }) {
  const visible = await visibleWardIds(auth);
  assertWardInScope(auth, visible, input.wardId);
  const count = await repo.publishSchedule(input.wardId, input.date, auth.id);
  await recordChainAudit({
    actorId: auth.id, actorRole: auth.rawRoles[0] ?? 'unknown', actorDept: auth.deptName,
    action: 'nursing_schedule_publish', resourceType: 'nursing_schedule',
    resourceId: input.wardId, result: 'success',
    detail: { wardId: input.wardId, date: input.date, published: count },
  });
  return { published: count, date: input.date, wardId: input.wardId };
}

// ---------------------------------------------------------------------------
// 休假
// ---------------------------------------------------------------------------
export async function listLeave(auth: AuthView, opts: { nurseId?: string }) {
  return { leaves: await repo.listLeave({ nurseId: opts.nurseId }) };
}

export async function createLeave(auth: AuthView, input: {
  nurseId: string; date: string; leaveType: string; reason?: string;
}) {
  const row = await repo.createLeave({ ...input, createdBy: auth.id });
  return { leave: row };
}

// ---------------------------------------------------------------------------
// 指标
// ---------------------------------------------------------------------------
export async function listIndicatorCatalog(auth: AuthView) {
  return { indicators: await repo.listIndicators() };
}

export async function getIndicatorDashboard(auth: AuthView, input: {
  wardId?: string; period: string;
}) {
  const visible = await visibleWardIds(auth);
  const wardId = input.wardId;
  if (wardId) assertWardInScope(auth, visible, wardId);
  // period = YYYY-MM -> 时间窗
  const from = `${input.period}-01`;
  const to = `${input.period}-28`;
  const metrics = wardId
    ? await repo.aggregateWindowMetrics({ wardId, from, to })
    : { bedCount: 0, nurseCount: 0, onDutyNurseCount: 0, inpatientCount: 0, highPressureRiskCount: 0, highFallRiskCount: 0, scheduledCount: 0, compliantScheduledCount: 0 };
  const values = await repo.listIndicatorValues(input.period, wardId ?? null);
  const manualOverrides: Record<string, { numerator: number; denominator: number }> = {};
  for (const v of values) {
    if (v.source === 'manual' && v.numerator != null && v.denominator != null) {
      manualOverrides[v.indicatorCode] = { numerator: Number(v.numerator), denominator: Number(v.denominator) };
    }
  }
  const results = wardId ? computeIndicators(metrics, manualOverrides) : [];
  return { period: input.period, wardId: wardId ?? null, indicators: results };
}

export async function enterIndicatorValue(auth: AuthView, input: {
  indicatorCode: string; wardId?: string; period: string;
  numerator: number; denominator: number; note?: string;
}) {
  if (input.wardId) {
    const visible = await visibleWardIds(auth);
    assertWardInScope(auth, visible, input.wardId);
  }
  const check = validateManualEntry(input.numerator, input.denominator);
  if (!check.ok) throw new CareError(400, 'BAD_REQUEST', check.message!);
  const row = await repo.saveIndicatorValue({
    indicatorCode: input.indicatorCode, wardId: input.wardId ?? null, period: input.period,
    numerator: input.numerator, denominator: input.denominator, source: 'manual',
    note: input.note, enteredBy: auth.id,
  });
  return { value: row };
}
