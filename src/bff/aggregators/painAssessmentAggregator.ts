/**
 * 健澜科技 jlmedaios - 疼痛评估聚合器（M29-B）
 * 复用 canAccessVisit（越权403）；纯函数分级；recordChainAudit 留痕。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { getVisitById, type Visit } from '../../db/repositories/visitRepo.js';
import { canAccessVisit } from './inpatientCareAggregator.js';
import { createAssessment, listByVisit, type PainAssessment } from '../../db/repositories/painAssessmentRepo.js';
import { advice, needAnalgesia, painLevel, reassessIntervalHours, type PainLevel } from '../../medical-tools/nursing/painAssessment.js';

export class PainError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message); this.name = 'PainError';
  }
}
const badRequest = (m: string) => new PainError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new PainError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new PainError(403, 'FORBIDDEN', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function assertUuid(id: string, label: string): void {
  if (!id || !UUID_RE.test(id.trim())) throw badRequest(`${label} 须为 UUID`);
}

const TYPES = new Set(['admission', 'postop', 'cancer', 'followup']);

async function loadVisit(auth: AuthView, visitId: string): Promise<Visit> {
  const visit = await getVisitById(visitId);
  if (!visit) throw notFound('就诊不存在');
  if (!canAccessVisit(auth, visit)) throw forbidden('超出数据权限范围，无法操作该患者');
  return visit;
}

export async function createAssessmentView(
  auth: AuthView,
  input: { visitId: string; score: number; assessType: string; location?: string; note?: string },
): Promise<PainAssessment & { level: PainLevel; needAnalgesia: boolean; reassessHours: number; advice: string }> {
  assertPermission(auth, 'pain:assess');
  assertUuid(input.visitId, '就诊');
  if (!Number.isInteger(input.score) || input.score < 0 || input.score > 10) throw badRequest('score 须为 0..10');
  if (!TYPES.has(input.assessType)) throw badRequest('非法 assess_type');
  const visit = await loadVisit(auth, input.visitId);
  const rec = await withTx(async (tx) => {
    const r = await createAssessment({
      visitId: input.visitId, score: input.score, assessType: input.assessType,
      location: input.location ?? null, note: input.note ?? null, createdBy: auth.id,
    }, tx);
    await recordChainAudit({
      actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
      action: 'pain.assess', resourceType: 'pain_assessment', resourceId: r.id,
      patientRef: visit.patientId, visitRef: visit.id, result: 'success',
      detail: { score: r.score, level: painLevel(r.score) },
    }, tx);
    return r;
  });
  return {
    ...rec,
    level: painLevel(rec.score),
    needAnalgesia: needAnalgesia(rec.score),
    reassessHours: reassessIntervalHours(rec.assessType, rec.score),
    advice: advice(rec.score, rec.assessType),
  };
}

export async function listAssessmentsView(auth: AuthView, visitId: string): Promise<PainAssessment[]> {
  assertPermission(auth, 'pain:view');
  assertUuid(visitId, '就诊');
  await loadVisit(auth, visitId);
  return listByVisit(visitId);
}
