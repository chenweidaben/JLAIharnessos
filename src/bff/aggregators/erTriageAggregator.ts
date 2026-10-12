/**
 * 健澜科技 jlmedaios - 急诊预检分诊聚合器（M35-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { getVisitById, type Visit } from '../../db/repositories/visitRepo.js';
import { canAccessVisit } from './inpatientCareAggregator.js';
import { upsertByVisit, getByVisit, type Triage } from '../../db/repositories/erTriageRepo.js';
import { triageLevel, needsGreenChannel } from '../../medical-tools/nursing/erTriage.js';

export class TriageError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message); this.name = 'TriageError';
  }
}
const badRequest = (m: string) => new TriageError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new TriageError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new TriageError(403, 'FORBIDDEN', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadVisit(auth: AuthView, visitId: string): Promise<Visit> {
  const v = await getVisitById(visitId);
  if (!v) throw notFound('就诊不存在');
  if (!canAccessVisit(auth, v)) throw forbidden('超出数据权限范围');
  return v;
}

export async function triageView(
  auth: AuthView,
  inp: {
    visitId: string; chiefComplaint: string;
    heartRate?: number | null; systolicBp?: number | null; diastolicBp?: number | null;
    respRate?: number | null; spo2?: number | null; temperatureC?: number | null; gcs?: number | null;
  },
): Promise<Triage> {
  assertPermission(auth, 'er_triage:assess');
  if (!UUID_RE.test(inp.visitId)) throw badRequest('visitId 非法');
  if (!inp.chiefComplaint || inp.chiefComplaint.trim().length === 0) throw badRequest('chiefComplaint 必填');
  const visit = await loadVisit(auth, inp.visitId);
  const level = triageLevel(inp);
  const green = needsGreenChannel(level);
  const rec = await withTx(async (tx) => {
    const r = await upsertByVisit({
      ...inp, level, greenChannel: green, triagedBy: auth.id,
    }, tx);
    await recordChainAudit({
      actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
      action: 'er.triage', resourceType: 'er_triage', resourceId: r.id,
      patientRef: visit.patientId, visitRef: visit.id, result: 'success',
      detail: { level, green },
    }, tx);
    return r;
  });
  return rec;
}

export async function getTriageView(auth: AuthView, visitId: string): Promise<Triage | null> {
  assertPermission(auth, 'er_triage:view');
  if (!UUID_RE.test(visitId)) throw notFound('visitId 非法');
  await loadVisit(auth, visitId);
  return getByVisit(visitId);
}
