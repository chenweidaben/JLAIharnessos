/**
 * 健澜科技 jlmedaios - 术后镇痛随访聚合器（M31-C）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { getVisitById, type Visit } from '../../db/repositories/visitRepo.js';
import { canAccessVisit } from './inpatientCareAggregator.js';
import { upsertSchedule, listByVisit, completeFollowup, type Followup } from '../../db/repositories/postopFollowupRepo.js';
import { buildSchedule, shouldEscalate, type Timepoint } from '../../medical-tools/nursing/postopFollowup.js';
import { createTask, hasOpenTask } from '../../db/repositories/improvementTaskRepo.js';
import { painTaskFinding, painTaskTitle } from '../../medical-tools/nursing/interventionTask.js';

export class FollowupError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message); this.name = 'FollowupError';
  }
}
const badRequest = (m: string) => new FollowupError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new FollowupError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new FollowupError(403, 'FORBIDDEN', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TPS = new Set(['6h','24h','48h']);

async function loadVisit(auth: AuthView, visitId: string): Promise<Visit> {
  const v = await getVisitById(visitId);
  if (!v) throw notFound('就诊不存在');
  if (!canAccessVisit(auth, v)) throw forbidden('超出数据权限范围');
  return v;
}

export async function scheduleView(auth: AuthView, visitId: string, surgeryEndAt: string): Promise<Followup[]> {
  assertPermission(auth, 'postop_followup:view');
  if (!UUID_RE.test(visitId)) throw badRequest('visitId 非法');
  const end = new Date(surgeryEndAt);
  if (isNaN(end.getTime())) throw badRequest('surgeryEndAt 非法');
  const visit = await loadVisit(auth, visitId);
  await upsertSchedule(visitId, buildSchedule(end));
  await recordChainAudit({
    actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
    action: 'postop.schedule', resourceType: 'postop_followup', resourceId: visitId,
    patientRef: visit.patientId, visitRef: visit.id, result: 'success', detail: {},
  });
  return listByVisit(visitId);
}

export async function completeView(
  auth: AuthView, visitId: string, timepoint: string, score: number,
): Promise<Followup> {
  assertPermission(auth, 'postop_followup:view');
  if (!UUID_RE.test(visitId)) throw badRequest('visitId 非法');
  if (!TPS.has(timepoint)) throw badRequest('timepoint 非法');
  if (!Number.isInteger(score) || score < 0 || score > 10) throw badRequest('score 须 0..10');
  const visit = await loadVisit(auth, visitId);
  const rec = await withTx(async (tx) => {
    let workOrderId: string | null = null;
    if (shouldEscalate(score)) {
      const exists = await hasOpenTask(visitId, 'pain', tx);
      if (!exists) {
        const t = await createTask({
          source: 'pain', visitId, title: painTaskTitle(score), finding: painTaskFinding(score),
          assigneeId: visit.attendingDoctorId ?? auth.id, createdBy: auth.id,
        }, tx);
        workOrderId = t.id;
      }
    }
    const r = await completeFollowup(visitId, timepoint, score, workOrderId, tx);
    if (!r) throw notFound('随访记录不存在或已完成');
    await recordChainAudit({
      actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
      action: 'postop.complete', resourceType: 'postop_followup', resourceId: r.id,
      patientRef: visit.patientId, visitRef: visit.id, result: 'success',
      detail: { timepoint, score, workOrderId },
    }, tx);
    return r;
  });
  return rec;
}

export async function listView(auth: AuthView, visitId: string): Promise<Followup[]> {
  assertPermission(auth, 'postop_followup:view');
  if (!UUID_RE.test(visitId)) throw notFound('visitId 非法');
  await loadVisit(auth, visitId);
  return listByVisit(visitId);
}
