/**
 * 健澜科技 jlmedaios - 入院营养风险筛查聚合器（M29-A）
 *
 * 复用 inpatientCareAggregator.canAccessVisit（越权403）；纯函数算分；
 * nutrition_risk=true 时返回建议（营养科会诊）；recordChainAudit 留痕。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { getVisitById, type Visit } from '../../db/repositories/visitRepo.js';
import { canAccessVisit } from './inpatientCareAggregator.js';
import { createScreening, listByVisit, type NutritionScreening } from '../../db/repositories/nutritionScreeningRepo.js';
import { assessNutrition, type NutritionResult } from '../../medical-tools/nursing/nutritionScreening.js';

export class NutritionError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'NutritionError';
  }
}
const badRequest = (m: string) => new NutritionError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new NutritionError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new NutritionError(403, 'FORBIDDEN', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function assertUuid(id: string, label: string): void {
  if (!id || !UUID_RE.test(id.trim())) throw badRequest(`${label} 须为 UUID`);
}

async function loadVisit(auth: AuthView, visitId: string): Promise<Visit> {
  const visit = await getVisitById(visitId);
  if (!visit) throw notFound('就诊不存在');
  if (!canAccessVisit(auth, visit)) throw forbidden('超出数据权限范围，无法操作该患者');
  return visit;
}

export async function createScreeningView(
  auth: AuthView,
  input: { visitId: string; nutritionScore: number; diseaseSeverity: number; ageYears: number; resultNote?: string },
): Promise<NutritionScreening & { advice: string }> {
  assertPermission(auth, 'nutrition:screen');
  assertUuid(input.visitId, '就诊');
  if (!Number.isInteger(input.nutritionScore) || input.nutritionScore < 0 || input.nutritionScore > 3) {
    throw badRequest('nutritionScore 须为 0..3');
  }
  if (!Number.isInteger(input.diseaseSeverity) || input.diseaseSeverity < 0 || input.diseaseSeverity > 3) {
    throw badRequest('diseaseSeverity 须为 0..3');
  }
  if (!Number.isFinite(input.ageYears) || input.ageYears < 0 || input.ageYears > 130) {
    throw badRequest('ageYears 非法');
  }
  const visit = await loadVisit(auth, input.visitId);
  const result: NutritionResult = assessNutrition({
    nutritionScore: input.nutritionScore,
    diseaseSeverity: input.diseaseSeverity,
    ageYears: input.ageYears,
  });
  const rec = await withTx(async (tx) => {
    const r = await createScreening({
      visitId: input.visitId,
      nutritionScore: result.nutritionScore,
      diseaseSeverity: result.diseaseSeverity,
      ageBonus: result.ageBonus,
      totalScore: result.totalScore,
      nutritionRisk: result.nutritionRisk,
      resultNote: input.resultNote ?? null,
      createdBy: auth.id,
    }, tx);
    await recordChainAudit({
      actorId: auth.id,
      actorRole: auth.rawRoles.join(','),
      actorDept: auth.deptName,
      action: 'nutrition.screen',
      resourceType: 'nutrition_screening',
      resourceId: r.id,
      patientRef: visit.patientId,
      visitRef: visit.id,
      result: 'success',
      detail: { totalScore: r.totalScore, risk: r.nutritionRisk },
    }, tx);
    return r;
  });
  return { ...rec, advice: result.advice };
}

export async function listScreeningsView(auth: AuthView, visitId: string): Promise<NutritionScreening[]> {
  assertPermission(auth, 'nutrition:view');
  assertUuid(visitId, '就诊');
  await loadVisit(auth, visitId);
  return listByVisit(visitId);
}
