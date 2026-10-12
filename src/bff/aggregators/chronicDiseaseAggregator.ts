/**
 * 健澜科技 jlmedaios - 慢病管理聚合器（M39-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { createTask, hasOpenTask } from '../../db/repositories/improvementTaskRepo.js';
import { createPlan, recordVitals, listPlans, listVitalsByPatient, type Plan, type Vitals } from '../../db/repositories/chronicRepo.js';
import { abnormalLevel } from '../../medical-tools/nursing/chronicDisease.js';

export class ChronicError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message); this.name = 'ChronicError';
  }
}
const badRequest = (m: string) => new ChronicError(400, 'BAD_REQUEST', m);
const forbidden = (m: string) => new ChronicError(403, 'FORBIDDEN', m);
function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function createPlanView(
  auth: AuthView,
  inp: { patientId: string; disease: 'hypertension' | 'diabetes'; targetSbp?: number | null; targetDbp?: number | null; targetHba1c?: number | null; nextFollowupAt: string },
): Promise<Plan> {
  assertPermission(auth, 'chronic:manage');
  if (!UUID_RE.test(inp.patientId)) throw badRequest('patientId 非法');
  return withTx(async (tx) => {
    const r = await createPlan(inp, tx);
    await recordChainAudit({
      actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
      action: 'chronic.plan', resourceType: 'chronic_followup_plan', resourceId: r.id,
      patientRef: r.patientId, visitRef: null, result: 'success',
      detail: { disease: r.disease },
    }, tx);
    return r;
  });
}

export async function recordVitalsView(
  auth: AuthView,
  inp: { patientId: string; sbp?: number | null; dbp?: number | null; fastingGlucose?: number | null; hba1c?: number | null; note?: string | null },
): Promise<Vitals & { level: string; interventionTaskId: string | null }> {
  assertPermission(auth, 'chronic:manage');
  if (!UUID_RE.test(inp.patientId)) throw badRequest('patientId 非法');
  const disease = inp.sbp != null || inp.dbp != null ? 'hypertension' : 'diabetes';
  const level = abnormalLevel(disease, inp.sbp ?? null, inp.dbp ?? null, inp.fastingGlucose ?? null, inp.hba1c ?? null);
  const { rec, taskId } = await withTx(async (tx) => {
    const r = await recordVitals({ ...inp, createdBy: auth.id }, tx);
    await recordChainAudit({
      actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
      action: 'chronic.vitals', resourceType: 'chronic_vitals', resourceId: r.id,
      patientRef: r.patientId, visitRef: null, result: 'success',
      detail: { level, sbp: r.sbp, dbp: r.dbp, fpg: r.fastingGlucose, hba1c: r.hba1c },
    }, tx);
    let taskId: string | null = null;
    if (level === 'abnormal' || level === 'critical') {
      const exists = await hasOpenTask(r.patientId, 'chronic', tx);
      if (!exists) {
        const t = await createTask({
          source: 'chronic', visitId: null,
          title: `Chronic ${disease} ${level}`,
          finding: `sbp=${r.sbp} dbp=${r.dbp} fpg=${r.fastingGlucose} hba1c=${r.hba1c} level=${level}`,
          assigneeId: auth.id, createdBy: auth.id,
        }, tx);
        taskId = t.id;
      }
    }
    return { rec: r, taskId };
  });
  return { ...rec, level, interventionTaskId: taskId };
}

export async function listChronicView(auth: AuthView, patientId: string): Promise<{ plans: Plan[]; vitals: Vitals[] }> {
  assertPermission(auth, 'chronic:view');
  if (!UUID_RE.test(patientId)) throw badRequest('patientId 非法');
  const [plans, vitals] = await Promise.all([listPlans(patientId), listVitalsByPatient(patientId)]);
  return { plans, vitals };
}
