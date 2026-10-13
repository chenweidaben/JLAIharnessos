/**
 * 健澜科技 jlmedaios - MDT 治疗方案聚合器（M67-A）
 * MDT concluded 后自动生成方案草稿；主治医生确认→confirmed 并填排程；越权 403。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type { AuthView } from '../view/userView.js';
import { getVisitById } from '../../db/repositories/visitRepo.js';
import { canAccessVisit } from './inpatientCareAggregator.js';
import {
  createFromMdt, confirmPlan, listByVisit, type TreatmentPlan,
} from '../../db/repositories/mdtTreatmentPlanRepo.js';
import { suggestPlanType } from '../../medical-tools/nursing/mdtTreatmentPlan.js';

export class TreatmentPlanError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'TreatmentPlanError';
  }
}
const notFound = (m: string) => new TreatmentPlanError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new TreatmentPlanError(403, 'FORBIDDEN', m);
const badRequest = (m: string) => new TreatmentPlanError(400, 'BAD_REQUEST', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function assertVisitScope(auth: AuthView, visitId: string) {
  const visit = await getVisitById(visitId);
  if (!visit) throw notFound('就诊不存在');
  if (!canAccessVisit(auth, visit)) throw forbidden('超出数据权限范围');
  return visit;
}

/** MDT concluded 后生成方案草稿。 */
export async function draftView(
  auth: AuthView,
  input: { mdtConsultId: string; visitId: string; departments: string[]; conclusion: string; draft?: string },
): Promise<TreatmentPlan> {
  assertPermission(auth, 'treatment_plan:manage');
  if (!UUID_RE.test(input.mdtConsultId.trim())) throw badRequest('会诊标识非法');
  if (!UUID_RE.test(input.visitId.trim())) throw badRequest('就诊标识非法');
  await assertVisitScope(auth, input.visitId.trim());
  const planType = suggestPlanType(input.departments, input.conclusion);
  return createFromMdt({
    mdtConsultId: input.mdtConsultId.trim(),
    visitId: input.visitId.trim(),
    planType,
    draft: input.draft?.trim() || `建议${planType}治疗`,
  });
}

/** 确认方案 + 排程。 */
export async function confirmView(auth: AuthView, id: string, scheduledAt: string): Promise<TreatmentPlan> {
  assertPermission(auth, 'treatment_plan:manage');
  if (!UUID_RE.test(id.trim())) throw badRequest('方案标识非法');
  if (!scheduledAt.trim()) throw badRequest('排程时间不能为空');
  return confirmPlan(id.trim(), scheduledAt.trim(), auth.id);
}

/** 按就诊列出。 */
export async function listView(auth: AuthView, visitId: string): Promise<TreatmentPlan[]> {
  assertPermission(auth, 'treatment_plan:view');
  if (!UUID_RE.test(visitId.trim())) throw badRequest('就诊标识非法');
  await assertVisitScope(auth, visitId.trim());
  return listByVisit(visitId.trim());
}
