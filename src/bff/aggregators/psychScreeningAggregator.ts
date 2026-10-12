/**
 * 健澜科技 jlmedaios - 心理筛查聚合器（M44-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { createTask, hasOpenTask } from '../../db/repositories/improvementTaskRepo.js';
import { create, listByVisit, type Screening } from '../../db/repositories/psychScreeningRepo.js';
import { phq9Level, gad7Level, needsReferral, sumAnswers } from '../../medical-tools/nursing/psychScreening.js';

export class PsychError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message); this.name = 'PsychError';
  }
}
const badRequest = (m: string) => new PsychError(400, 'BAD_REQUEST', m);
const forbidden = (m: string) => new PsychError(403, 'FORBIDDEN', m);
function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function createScreeningView(
  auth: AuthView,
  inp: { visitId: string; phq9Answers: number[]; gad7Answers: number[] },
): Promise<Screening & { taskId: string | null }> {
  assertPermission(auth, 'psych:screen');
  if (!UUID_RE.test(inp.visitId)) throw badRequest('visitId 非法');
  const phq9Total = sumAnswers(inp.phq9Answers);
  const gad7Total = sumAnswers(inp.gad7Answers);
  const phq9Lvl = phq9Level(phq9Total);
  const gad7Lvl = gad7Level(gad7Total);
  const severe = needsReferral(phq9Total, gad7Total);
  const { rec, taskId } = await withTx(async (tx) => {
    const r = await create({ ...inp, phq9Total, phq9Level: phq9Lvl, gad7Total, gad7Level: gad7Lvl, createdBy: auth.id }, tx);
    await recordChainAudit({
      actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
      action: 'psych.screen', resourceType: 'psych_screening', resourceId: r.id,
      patientRef: null, visitRef: r.visitId, result: 'success',
      detail: { phq9: r.phq9Total, gad7: r.gad7Total },
    }, tx);
    let taskId: string | null = null;
    if (severe) {
      const exists = await hasOpenTask(r.visitId, 'mental_health', tx);
      if (!exists) {
        const t = await createTask({
          source: 'mental_health', visitId: r.visitId,
          title: `PHQ9=${r.phq9Total} GAD7=${r.gad7Total}`,
          finding: `phq9=${r.phq9Total} (${r.phq9Level}) gad7=${r.gad7Total} (${r.gad7Level})`,
          assigneeId: auth.id, createdBy: auth.id,
        }, tx);
        taskId = t.id;
      }
    }
    return { rec: r, taskId };
  });
  return { ...rec, taskId };
}

export async function listView(auth: AuthView, visitId: string): Promise<Screening[]> {
  assertPermission(auth, 'psych:view');
  if (!UUID_RE.test(visitId)) throw badRequest('visitId 非法');
  return listByVisit(visitId);
}
