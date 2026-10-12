/**
 * 健澜科技 jlmedaios - ICU RASS 镇静评分聚合器（M33-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { getVisitById, type Visit } from '../../db/repositories/visitRepo.js';
import { canAccessVisit } from './inpatientCareAggregator.js';
import { create, listByVisit, type Sedation } from '../../db/repositories/icuSedationRepo.js';
import { rassLevel, withinTarget, overSedated } from '../../medical-tools/nursing/icuSedation.js';
import { createTask, hasOpenTask } from '../../db/repositories/improvementTaskRepo.js';
import { needsAdjustment, sedationTaskTitle, sedationTaskFinding } from '../../medical-tools/nursing/icuSedationAlert.js';

export class SedationError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message); this.name = 'SedationError';
  }
}
const badRequest = (m: string) => new SedationError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new SedationError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new SedationError(403, 'FORBIDDEN', m);

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

export async function recordSedationView(
  auth: AuthView,
  inp: { visitId: string; rassScore: number; targetRass?: number; onVentilator?: boolean; sedativeDrug?: string | null; note?: string | null },
): Promise<Sedation & { level: string; inTarget: boolean; overSedated: boolean; interventionTaskId: string | null }> {
  assertPermission(auth, 'icu_sedation:assess');
  if (!UUID_RE.test(inp.visitId)) throw badRequest('visitId 非法');
  if (!Number.isInteger(inp.rassScore) || inp.rassScore < -5 || inp.rassScore > 4) throw badRequest('rass_score 须 -5..4');
  const target = inp.targetRass ?? -1;
  if (!Number.isInteger(target) || target < -5 || target > 1) throw badRequest('target_rass 须 -5..1');
  const visit = await loadVisit(auth, inp.visitId);
  const out = await withTx(async (tx) => {
    const r = await create({
      visitId: inp.visitId, rassScore: inp.rassScore, targetRass: target,
      onVentilator: inp.onVentilator ?? false, sedativeDrug: inp.sedativeDrug ?? null,
      note: inp.note ?? null, createdBy: auth.id,
    }, tx);
    await recordChainAudit({
      actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
      action: 'icu.sedation', resourceType: 'icu_sedation', resourceId: r.id,
      patientRef: visit.patientId, visitRef: visit.id, result: 'success',
      detail: { rass: r.rassScore, target: r.targetRass },
    }, tx);
    let taskId: string | null = null;
    if (needsAdjustment(r.rassScore)) {
      const exists = await hasOpenTask(r.visitId, 'icu_sedation', tx);
      if (!exists) {
        const t = await createTask({
          source: 'icu_sedation', visitId: r.visitId,
          title: sedationTaskTitle(r.rassScore), finding: sedationTaskFinding(r.rassScore),
          assigneeId: visit.attendingDoctorId ?? auth.id, createdBy: auth.id,
        }, tx);
        taskId = t.id;
      }
    }
    return { rec: r, taskId };
  });
  return {
    ...out.rec,
    level: rassLevel(out.rec.rassScore),
    inTarget: withinTarget(out.rec.rassScore, out.rec.targetRass),
    overSedated: overSedated(out.rec.rassScore),
    interventionTaskId: out.taskId,
  };
}

export async function listSedationView(auth: AuthView, visitId: string): Promise<Sedation[]> {
  assertPermission(auth, 'icu_sedation:view');
  if (!UUID_RE.test(visitId)) throw notFound('visitId 非法');
  await loadVisit(auth, visitId);
  return listByVisit(visitId);
}
