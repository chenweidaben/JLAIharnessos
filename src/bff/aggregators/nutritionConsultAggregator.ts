/**
 * 健澜科技 jlmedaios - 营养科会诊聚合器（M58-A）
 *
 * 营养师会诊 -> 纯函数方案分级；随访到期标记 needsFollowup；
 * 越权（数据范围外 visit）-> 403；无权限码 -> 403。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { withTx } from '../../db/pool.js';
import type { AuthView } from '../view/userView.js';
import { getVisitById } from '../../db/repositories/visitRepo.js';
import { canAccessVisit } from './inpatientCareAggregator.js';
import {
  createConsult, recordFollowup, listByVisit, type NutritionConsult,
} from '../../db/repositories/nutritionConsultRepo.js';
import { planTier, needsFollowup, type PlanTier } from '../../medical-tools/nursing/nutritionConsult.js';

export class NutritionConsultError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'NutritionConsultError';
  }
}
const notFound = (m: string) => new NutritionConsultError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new NutritionConsultError(403, 'FORBIDDEN', m);
const badRequest = (m: string) => new NutritionConsultError(400, 'BAD_REQUEST', m);

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

export interface ConsultView {
  consult: NutritionConsult;
  planTier: PlanTier;
}

/** 录入营养会诊。 */
export async function consultView(
  auth: AuthView,
  input: {
    visitId: string; consultType?: string; nutritionDiagnosis: string; plan: string;
    caloriesPerDay: number; followupDays?: number;
  },
): Promise<ConsultView> {
  assertPermission(auth, 'nutrition_consult:manage');
  const visitId = input.visitId.trim();
  if (!UUID_RE.test(visitId)) throw badRequest('就诊标识非法');
  await assertVisitScope(auth, visitId);

  const type = input.consultType === 'urgent' ? 'urgent' : 'routine';
  const calories = Math.round(Number(input.caloriesPerDay));
  if (!Number.isFinite(calories) || calories < 800 || calories > 4000) throw badRequest('每日能量须在 800~4000 kcal');
  if (!input.nutritionDiagnosis?.trim()) throw badRequest('营养诊断必填');
  if (!input.plan?.trim()) throw badRequest('营养方案必填');
  const followupDays = Number.isFinite(Number(input.followupDays)) ? Math.max(1, Math.round(Number(input.followupDays))) : 7;

  return withTx(async (tx) => {
    const consult = await createConsult({
      visitId,
      consultType: type,
      nutritionDiagnosis: input.nutritionDiagnosis.trim(),
      plan: input.plan.trim(),
      caloriesPerDay: calories,
      followupDays,
      dietitian: auth.id,
    }, tx);
    return { consult, planTier: planTier(calories) };
  });
}

/** 记录随访。 */
export async function followupView(auth: AuthView, id: string): Promise<NutritionConsult> {
  assertPermission(auth, 'nutrition_consult:manage');
  if (!UUID_RE.test(id.trim())) throw badRequest('会诊标识非法');
  return withTx(async (tx) => {
    const updated = await recordFollowup(id.trim(), tx);
    await assertVisitScope(auth, updated.visitId);
    return updated;
  });
}

/** 列表（附随访到期标记）。 */
export async function listView(auth: AuthView, visitId: string, today: string): Promise<(NutritionConsult & { needsFollowup: boolean })[]> {
  assertPermission(auth, 'nutrition_consult:view');
  if (!UUID_RE.test(visitId.trim())) throw badRequest('就诊标识非法');
  await assertVisitScope(auth, visitId.trim());
  const rows = await listByVisit(visitId.trim());
  return rows.map((r) => ({
    ...r,
    needsFollowup: needsFollowup(r.status, r.createdAt, r.followupDays, today),
  }));
}
