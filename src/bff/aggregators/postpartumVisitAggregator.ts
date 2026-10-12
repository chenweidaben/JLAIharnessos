/**
 * 健澜科技 jlmedaios - 产后访视聚合器（M34-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { getVisitById, type Visit } from '../../db/repositories/visitRepo.js';
import { canAccessVisit } from './inpatientCareAggregator.js';
import { create, listByMother, type PostpartumVisit } from '../../db/repositories/postpartumVisitRepo.js';
import { jaundiceElevated, breastfeedingAdequacy } from '../../medical-tools/nursing/postpartumVisit.js';
import { createTask, hasOpenTask } from '../../db/repositories/improvementTaskRepo.js';
import { needsReferral, postpartumTaskTitle, postpartumTaskFinding } from '../../medical-tools/nursing/postpartumAlert.js';

export class PostpartumError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message); this.name = 'PostpartumError';
  }
}
const badRequest = (m: string) => new PostpartumError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new PostpartumError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new PostpartumError(403, 'FORBIDDEN', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VISUAL = new Set(['none','face','trunk','extremities','generalized']);

async function loadVisit(auth: AuthView, visitId: string): Promise<Visit> {
  const v = await getVisitById(visitId);
  if (!v) throw notFound('就诊不存在');
  if (!canAccessVisit(auth, v)) throw forbidden('超出数据权限范围');
  return v;
}

export async function recordPostpartumView(
  auth: AuthView,
  inp: {
    motherVisitId: string; babyVisitId?: string | null; postpartumDay: number;
    breastfeedingScore: number; jaundiceTcb?: number | null; jaundiceVisual?: string;
    motherTempC?: number | null; note?: string | null;
  },
): Promise<PostpartumVisit & { jaundiceElevated: boolean; breastfeedingAdequate: boolean; referToNICU: boolean; interventionTaskId: string | null }> {
  assertPermission(auth, 'postpartum:assess');
  if (!UUID_RE.test(inp.motherVisitId)) throw badRequest('motherVisitId 非法');
  if (![1,2,3].includes(inp.postpartumDay)) throw badRequest('postpartum_day 须 1/2/3');
  if (!Number.isInteger(inp.breastfeedingScore) || inp.breastfeedingScore < 0 || inp.breastfeedingScore > 3) throw badRequest('breastfeeding_score 须 0..3');
  if (inp.jaundiceVisual && !VISUAL.has(inp.jaundiceVisual)) throw badRequest('jaundice_visual 非法');
  const visit = await loadVisit(auth, inp.motherVisitId);
  const rec = await withTx(async (tx) => {
    const r = await create({ ...inp, createdBy: auth.id }, tx);
    await recordChainAudit({
      actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
      action: 'postpartum.assess', resourceType: 'postpartum_visit', resourceId: r.id,
      patientRef: visit.patientId, visitRef: visit.id, result: 'success',
      detail: { day: r.postpartumDay, tcb: r.jaundiceTcb },
    }, tx);
    let taskId: string | null = null;
    if (needsReferral(r.postpartumDay, r.jaundiceTcb, r.breastfeedingScore)) {
      const exists = await hasOpenTask(r.motherVisitId, 'postpartum', tx);
      if (!exists) {
        const t = await createTask({
          source: 'postpartum', visitId: r.motherVisitId,
          title: postpartumTaskTitle(r.postpartumDay, r.jaundiceTcb, r.breastfeedingScore),
          finding: postpartumTaskFinding(r.postpartumDay, r.jaundiceTcb, r.breastfeedingScore),
          assigneeId: visit.attendingDoctorId ?? auth.id, createdBy: auth.id,
        }, tx);
        taskId = t.id;
      }
    }
    return { rec: r, taskId };
  });
  const elevated = jaundiceElevated(rec.rec.postpartumDay, rec.rec.jaundiceTcb);
  return {
    ...rec.rec,
    jaundiceElevated: elevated,
    breastfeedingAdequate: breastfeedingAdequacy(rec.rec.breastfeedingScore),
    referToNICU: elevated || rec.rec.jaundiceVisual === 'generalized',
    interventionTaskId: rec.taskId,
  };
}

export async function listPostpartumView(auth: AuthView, motherVisitId: string): Promise<PostpartumVisit[]> {
  assertPermission(auth, 'postpartum:view');
  if (!UUID_RE.test(motherVisitId)) throw notFound('motherVisitId 非法');
  await loadVisit(auth, motherVisitId);
  return listByMother(motherVisitId);
}
