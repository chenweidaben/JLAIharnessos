/**
 * 健澜科技 jlmedaios - PACU 记录聚合器（M31-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { getVisitById, type Visit } from '../../db/repositories/visitRepo.js';
import { canAccessVisit } from './inpatientCareAggregator.js';
import { create, discharge, listByVisit, type PacuRecord } from '../../db/repositories/pacuRecordRepo.js';
import { aldreteTotal, readyForDischarge } from '../../medical-tools/nursing/pacuRecord.js';
import { createTask, hasOpenTask } from '../../db/repositories/improvementTaskRepo.js';
import { pacuTaskTitle, shouldCreatePacuTask } from '../../medical-tools/nursing/anesthesiaAlert.js';

export class PacuError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message); this.name = 'PacuError';
  }
}
const badRequest = (m: string) => new PacuError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new PacuError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new PacuError(403, 'FORBIDDEN', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DESTS = new Set(['ward','icu','floor','extended_care']);

async function loadVisit(auth: AuthView, visitId: string): Promise<Visit> {
  const v = await getVisitById(visitId);
  if (!v) throw notFound('就诊不存在');
  if (!canAccessVisit(auth, v)) throw forbidden('超出数据权限范围');
  return v;
}
function inRange(v: number): boolean { return Number.isInteger(v) && v >= 0 && v <= 2; }

export async function recordPacuView(
  auth: AuthView,
  input: { visitId: string; activity: number; respiration: number; circulation: number; consciousness: number; spo2: number; note?: string },
): Promise<PacuRecord & { aldrete: number; ready: boolean; interventionTaskId: string | null }> {
  assertPermission(auth, 'pacu:record');
  if (!UUID_RE.test(input.visitId)) throw badRequest('visitId 非法');
  if (![input.activity, input.respiration, input.circulation, input.consciousness, input.spo2].every(inRange)) throw badRequest('Aldrete 各项须为 0..2');
  const visit = await loadVisit(auth, input.visitId);
  const out = await withTx(async (tx) => {
    const r = await create({
      visitId: input.visitId, activity: input.activity, respiration: input.respiration,
      circulation: input.circulation, consciousness: input.consciousness, spo2: input.spo2,
      note: input.note ?? null, createdBy: auth.id,
    }, tx);
    await recordChainAudit({
      actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
      action: 'pacu.record', resourceType: 'pacu_record', resourceId: r.id,
      patientRef: visit.patientId, visitRef: visit.id, result: 'success',
      detail: { aldrete: aldreteTotal(r.activity, r.respiration, r.circulation, r.consciousness, r.spo2) },
    }, tx);
    let taskId: string | null = null;
    const total = aldreteTotal(r.activity, r.respiration, r.circulation, r.consciousness, r.spo2);
    const delayed = !readyForDischarge(total);
    if (shouldCreatePacuTask(delayed)) {
      const exists = await hasOpenTask(r.visitId, 'anesthesia', tx);
      if (!exists) {
        const t = await createTask({
          source: 'anesthesia', visitId: r.visitId, title: pacuTaskTitle(),
          finding: `pacu aldrete=${total} not ready`,
          assigneeId: visit.attendingDoctorId ?? auth.id, createdBy: auth.id,
        }, tx);
        taskId = t.id;
      }
    }
    return { rec: r, taskId, total };
  });
  return { ...out.rec, aldrete: out.total, ready: readyForDischarge(out.total), interventionTaskId: out.taskId };
}

export async function dischargePacuView(auth: AuthView, id: string, destination: string): Promise<PacuRecord> {
  assertPermission(auth, 'pacu:record');
  if (!UUID_RE.test(id)) throw badRequest('id 非法');
  if (!DESTS.has(destination)) throw badRequest('去向非法');
  const rec = await discharge(id, destination);
  if (!rec) throw notFound('记录不存在或已出室');
  return rec;
}

export async function listPacuView(auth: AuthView, visitId: string): Promise<PacuRecord[]> {
  assertPermission(auth, 'pacu:view');
  if (!UUID_RE.test(visitId)) throw notFound('visitId 非法');
  await loadVisit(auth, visitId);
  return listByVisit(visitId);
}
