/**
 * 健澜科技 jlmedaios - 复诊号源预约聚合器（M62-A）
 *
 * 基于 discharge_plan.followup_department/followup_date 查 M19 号源，
 * 推荐可约号源并一键占用；越权（数据范围外 visit）-> 403。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { withTx } from '../../db/pool.js';
import type { AuthView } from '../view/userView.js';
import { getVisitById } from '../../db/repositories/visitRepo.js';
import { canAccessVisit } from './inpatientCareAggregator.js';
import {
  bookFollowup, cancel, getByPlanId, listAvailableSlots, listByVisit, type FollowupAppt,
} from '../../db/repositories/followupApptRepo.js';
import { isConflict, pickSuggestedSchedule, type SlotOption } from '../../medical-tools/nursing/followupAppt.js';

export class FollowupApptError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'FollowupApptError';
  }
}
const notFound = (m: string) => new FollowupApptError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new FollowupApptError(403, 'FORBIDDEN', m);
const badRequest = (m: string) => new FollowupApptError(400, 'BAD_REQUEST', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 推荐号源列表（基于出院计划的科室与建议日期）。 */
export async function recommendView(auth: AuthView, planId: string): Promise<{ options: SlotOption[]; suggested: SlotOption | null }> {
  assertPermission(auth, 'followup_appt:view');
  if (!UUID_RE.test(planId.trim())) throw badRequest('计划标识非法');
  // 找该 plan 对应 visit 做数据权限校验
  const plan = await withTx(async (tx) => {
    const rows = await tx`SELECT visit_id, followup_department, followup_date FROM clinical.discharge_plans WHERE id=${planId.trim()}`;
    return rows[0] as { visit_id: string; followup_department: string; followup_date: string } | undefined;
  });
  if (!plan) throw notFound('出院计划不存在');
  const visit = await getVisitById(String(plan.visit_id));
  if (!visit) throw notFound('就诊不存在');
  if (!canAccessVisit(auth, visit)) throw forbidden('超出数据权限范围');

  const options = await listAvailableSlots(String(plan.followup_department), String(plan.followup_date));
  const suggested = pickSuggestedSchedule(options, String(plan.followup_date));
  return { options, suggested };
}

/** 一键预约：占用指定号源。 */
export async function bookView(auth: AuthView, planId: string, scheduleId: string, appointmentDate: string, department: string): Promise<FollowupAppt> {
  assertPermission(auth, 'followup_appt:book');
  if (!UUID_RE.test(planId.trim())) throw badRequest('计划标识非法');
  if (!UUID_RE.test(scheduleId.trim())) throw badRequest('号源标识非法');
  return withTx(async (tx) => {
    const rows = await tx`SELECT visit_id, followup_department, followup_date FROM clinical.discharge_plans WHERE id=${planId.trim()}`;
    const plan = rows[0] as { visit_id: string } | undefined;
    if (!plan) throw notFound('出院计划不存在');
    const visit = await getVisitById(String(plan.visit_id));
    if (!visit) throw notFound('就诊不存在');
    if (!canAccessVisit(auth, visit)) throw forbidden('超出数据权限范围');

    const existing = await getByPlanId(planId.trim(), tx);
    if (existing && existing.status === 'booked') throw badRequest('该出院计划已存在有效预约');
    if (isConflict(existing?.status === 'cancelled' ? null : existing?.appointmentDate ?? null, appointmentDate)) {
      throw badRequest('该日期已存在预约');
    }
    return bookFollowup({
      dischargePlanId: planId.trim(), scheduleId: scheduleId.trim(),
      appointmentDate, department, bookedBy: auth.id,
    }, tx);
  });
}

/** 取消预约。 */
export async function cancelView(auth: AuthView, id: string): Promise<FollowupAppt> {
  assertPermission(auth, 'followup_appt:book');
  if (!UUID_RE.test(id.trim())) throw badRequest('预约标识非法');
  return withTx(async (tx) => {
    const rows = await tx`
      SELECT fa.id, dp.visit_id FROM clinical.followup_appointments fa
      JOIN clinical.discharge_plans dp ON dp.id = fa.discharge_plan_id WHERE fa.id=${id.trim()}`;
    const row = rows[0] as { id: string; visit_id: string } | undefined;
    if (!row) throw notFound('复诊预约不存在');
    const visit = await getVisitById(String(row.visit_id));
    if (!visit) throw notFound('就诊不存在');
    if (!canAccessVisit(auth, visit)) throw forbidden('超出数据权限范围');
    return cancel(id.trim(), tx);
  });
}

/** 按就诊列出预约。 */
export async function listView(auth: AuthView, visitId: string): Promise<FollowupAppt[]> {
  assertPermission(auth, 'followup_appt:view');
  if (!UUID_RE.test(visitId.trim())) throw badRequest('就诊标识非法');
  const visit = await getVisitById(visitId.trim());
  if (!visit) throw notFound('就诊不存在');
  if (!canAccessVisit(auth, visit)) throw forbidden('超出数据权限范围');
  return listByVisit(visitId.trim());
}
