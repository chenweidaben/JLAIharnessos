/**
 * 健澜科技 jlmedaios - 患者满意度 4 维度聚合器（M63-A）
 * 患者提交 4 维度问卷；管理员按科室汇总排名；低分维度标红。越权 403。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type { AuthView } from '../view/userView.js';
import { getVisitById } from '../../db/repositories/visitRepo.js';
import { canAccessVisit } from './inpatientCareAggregator.js';
import {
  listAll, listByVisit, submitSurvey, type SurveyRow,
} from '../../db/repositories/satisfactionSurveyRepo.js';
import {
  departmentRanking, dimensionAverage, lowDimension,
  type DepartmentRank, type SurveyScores,
} from '../../medical-tools/nursing/satisfaction.js';

export class SurveyError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'SurveyError';
  }
}
const notFound = (m: string) => new SurveyError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new SurveyError(403, 'FORBIDDEN', m);
const badRequest = (m: string) => new SurveyError(400, 'BAD_REQUEST', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toScores(r: SurveyRow): SurveyScores {
  return {
    medical: r.medicalScore,
    nursing: r.nursingScore ?? 0,
    logistics: r.logisticsScore ?? 0,
    environment: r.environmentScore,
  };
}

/** 患者提交问卷。 */
export async function submitSurveyView(
  auth: AuthView,
  input: { visitId: string; patientId: string; medicalScore: number; nursingScore: number; logisticsScore: number; environmentScore: number; comment?: string | null; department: string },
): Promise<SurveyRow> {
  assertPermission(auth, 'satisfaction:submit');
  if (!UUID_RE.test(input.visitId.trim())) throw badRequest('就诊标识非法');
  const visit = await getVisitById(input.visitId.trim());
  if (!visit) throw notFound('就诊不存在');
  if (!canAccessVisit(auth, visit)) throw forbidden('超出数据权限范围');
  for (const k of ['medicalScore', 'nursingScore', 'logisticsScore', 'environmentScore'] as const) {
    const v = input[k];
    if (!Number.isInteger(v) || v < 1 || v > 5) throw badRequest(`${k} 须为 1-5 整数`);
  }
  if (!input.department.trim()) throw badRequest('科室不能为空');
  return submitSurvey({
    visitId: input.visitId.trim(),
    patientId: input.patientId.trim(),
    medicalScore: input.medicalScore,
    nursingScore: input.nursingScore,
    logisticsScore: input.logisticsScore,
    environmentScore: input.environmentScore,
    comment: input.comment ?? null,
    department: input.department.trim(),
    submittedBy: auth.id,
  });
}

/** 管理员科室汇总排名 + 整体均分。 */
export async function rankingView(auth: AuthView): Promise<{ ranks: DepartmentRank[]; overallAvg: number }> {
  assertPermission(auth, 'satisfaction:view');
  const rows = await listAll();
  const valid = rows.filter((r) => r.nursingScore != null && r.logisticsScore != null);
  const ranks = departmentRanking(valid.map((r) => ({ ...toScores(r), department: r.department })));
  const overallAvg = valid.length
    ? Math.round((valid.reduce((s, r) => s + dimensionAverage(toScores(r)), 0) / valid.length) * 100) / 100
    : 0;
  return { ranks, overallAvg };
}

/** 按就诊列出问卷（含低分维度标记）。 */
export async function listSurveyView(auth: AuthView, visitId: string): Promise<{ items: Array<SurveyRow & { avg: number; lowDims: string[] }> }> {
  assertPermission(auth, 'satisfaction:view');
  if (!UUID_RE.test(visitId.trim())) throw badRequest('就诊标识非法');
  const visit = await getVisitById(visitId.trim());
  if (!visit) throw notFound('就诊不存在');
  if (!canAccessVisit(auth, visit)) throw forbidden('超出数据权限范围');
  const rows = await listByVisit(visitId.trim());
  return {
    items: rows.map((r) => {
      const scores = toScores(r);
      return { ...r, avg: dimensionAverage(scores), lowDims: lowDimension(scores) };
    }),
  };
}
