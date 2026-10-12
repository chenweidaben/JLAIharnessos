/**
 * 健澜科技 jlmedaios - 术前评估聚合器（M31-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { getVisitById, type Visit } from '../../db/repositories/visitRepo.js';
import { canAccessVisit } from './inpatientCareAggregator.js';
import { create, listByVisit, type PreopAssessment } from '../../db/repositories/preopAssessmentRepo.js';
import { isComplete, isHighRisk, missingItems } from '../../medical-tools/nursing/preopAssessment.js';

export class PreopError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message); this.name = 'PreopError';
  }
}
const badRequest = (m: string) => new PreopError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new PreopError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new PreopError(403, 'FORBIDDEN', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ASA = new Set(['I','II','III','IV','V','VI']);

async function loadVisit(auth: AuthView, visitId: string): Promise<Visit> {
  const v = await getVisitById(visitId);
  if (!v) throw notFound('就诊不存在');
  if (!canAccessVisit(auth, v)) throw forbidden('超出数据权限范围');
  return v;
}

export async function createPreopView(
  auth: AuthView,
  input: { visitId: string; asaGrade: string; npoConfirmed: boolean; allergyChecked: boolean; consentSigned: boolean; assessmentNote?: string },
): Promise<PreopAssessment & { complete: boolean; missing: string[]; highRisk: boolean }> {
  assertPermission(auth, 'preop:assess');
  if (!UUID_RE.test(input.visitId)) throw badRequest('visitId 非法');
  if (!ASA.has(input.asaGrade)) throw badRequest('asa_grade 非法');
  const visit = await loadVisit(auth, input.visitId);
  const rec = await withTx(async (tx) => {
    const r = await create({
      visitId: input.visitId, asaGrade: input.asaGrade,
      npoConfirmed: input.npoConfirmed, allergyChecked: input.allergyChecked,
      consentSigned: input.consentSigned, assessmentNote: input.assessmentNote ?? null,
      createdBy: auth.id,
    }, tx);
    await recordChainAudit({
      actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
      action: 'preop.assess', resourceType: 'preop_assessment', resourceId: r.id,
      patientRef: visit.patientId, visitRef: visit.id, result: 'success',
      detail: { asa: r.asaGrade, complete: isComplete(r.npoConfirmed, r.allergyChecked, r.consentSigned) },
    }, tx);
    return r;
  });
  return {
    ...rec,
    complete: isComplete(rec.npoConfirmed, rec.allergyChecked, rec.consentSigned),
    missing: missingItems(rec.npoConfirmed, rec.allergyChecked, rec.consentSigned),
    highRisk: isHighRisk(rec.asaGrade),
  };
}

export async function listPreopView(auth: AuthView, visitId: string): Promise<PreopAssessment[]> {
  assertPermission(auth, 'preop:view');
  if (!UUID_RE.test(visitId)) throw notFound('visitId 非法');
  await loadVisit(auth, visitId);
  return listByVisit(visitId);
}
