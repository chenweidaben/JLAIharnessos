/**
 * 健澜科技 jlmedaios - 单患者护理评估汇总聚合器（M30-A）
 * 只读聚合：复用各 repo 最新值 + buildEvalSummary。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { getVisitById } from '../../db/repositories/visitRepo.js';
import { canAccessVisit } from './inpatientCareAggregator.js';
import { listByVisit as listNutrition } from '../../db/repositories/nutritionScreeningRepo.js';
import { listByVisit as listPain } from '../../db/repositories/painAssessmentRepo.js';
import { listByAssignee } from '../../db/repositories/improvementTaskRepo.js';
import { buildEvalSummary } from '../../medical-tools/nursing/evalSummary.js';

export class EvalError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message); this.name = 'EvalError';
  }
}
const notFound = (m: string) => new EvalError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new EvalError(403, 'FORBIDDEN', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getVisitEvaluations(auth: AuthView, visitId: string) {
  assertPermission(auth, 'nurse_eval:view');
  if (!UUID_RE.test(visitId)) throw notFound('visitId 非法');
  const visit = await getVisitById(visitId);
  if (!visit) throw notFound('就诊不存在');
  if (!canAccessVisit(auth, visit)) throw forbidden('超出数据权限范围');

  const [nuts, pains, myTasks] = await Promise.all([
    listNutrition(visitId),
    listPain(visitId),
    listByAssignee(auth.id),
  ]);
  const latestNut = nuts[0] ?? null;
  const latestPain = pains[0] ?? null;
  const openTasksForVisit = myTasks.filter((t) => t.visitId === visitId && ['open', 'accepted', 'in_progress'].includes(t.status));

  const summary = buildEvalSummary({
    nutrition: latestNut ? { totalScore: latestNut.totalScore, nutritionRisk: latestNut.nutritionRisk } : null,
    pain: latestPain ? { score: latestPain.score, level: latestPain.assessType } : null,
    tubeCount: 0,
    ioBalance: 0,
    openTaskCount: openTasksForVisit.length,
  });

  return {
    visitId,
    patientId: visit.patientId,
    department: visit.department,
    latestNutrition: latestNut,
    latestPain: latestPain,
    openTasks: openTasksForVisit,
    summary,
  };
}
