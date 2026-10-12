/**
 * 健澜科技 jlmedaios - 肿瘤随访聚合器（M41-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { createTask, hasOpenTask } from '../../db/repositories/improvementTaskRepo.js';
import { createCycle, listCycles, recordAdverseEvent, listAdverseEvents, type Cycle, type AdverseEvent } from '../../db/repositories/oncologyRepo.js';
import { isSevere } from '../../medical-tools/nursing/oncologyFollowup.js';

export class OncologyError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message); this.name = 'OncologyError';
  }
}
const badRequest = (m: string) => new OncologyError(400, 'BAD_REQUEST', m);
const forbidden = (m: string) => new OncologyError(403, 'FORBIDDEN', m);
function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function createCycleView(auth: AuthView, inp: { patientId: string; drugName: string; cycleNo: number; plannedDate: string }): Promise<Cycle> {
  assertPermission(auth, 'oncology:manage');
  if (!UUID_RE.test(inp.patientId)) throw badRequest('patientId 非法');
  return withTx(async (tx) => {
    const r = await createCycle(inp, tx);
    await recordChainAudit({
      actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
      action: 'oncology.cycle', resourceType: 'chemo_cycle', resourceId: r.id,
      patientRef: r.patientId, visitRef: null, result: 'success',
      detail: { drug: r.drugName, cycle: r.cycleNo },
    }, tx);
    return r;
  });
}

export async function recordAdverseView(
  auth: AuthView,
  inp: { cycleId: string; patientId: string; term: string; grade: number },
): Promise<AdverseEvent & { taskId: string | null }> {
  assertPermission(auth, 'oncology:manage');
  if (!UUID_RE.test(inp.cycleId) || !UUID_RE.test(inp.patientId)) throw badRequest('id 非法');
  const severe = isSevere(inp.grade);
  const { rec, taskId } = await withTx(async (tx) => {
    const r = await recordAdverseEvent({ ...inp, createdBy: auth.id }, tx);
    await recordChainAudit({
      actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
      action: 'oncology.ae', resourceType: 'chemo_adverse_event', resourceId: r.id,
      patientRef: r.patientId, visitRef: null, result: 'success',
      detail: { term: r.term, grade: r.grade },
    }, tx);
    let taskId: string | null = null;
    if (severe) {
      const exists = await hasOpenTask(r.patientId, 'oncology', tx);
      if (!exists) {
        const t = await createTask({
          source: 'oncology', visitId: null,
          title: `CTCAE grade${r.grade} ${r.term}`,
          finding: `patient=${r.patientId} cycle=${r.cycleId} term=${r.term} grade=${r.grade}`,
          assigneeId: auth.id, createdBy: auth.id,
        }, tx);
        taskId = t.id;
      }
    }
    return { rec: r, taskId };
  });
  return { ...rec, taskId };
}

export async function listView(auth: AuthView, patientId: string): Promise<{ cycles: Cycle[]; aes: AdverseEvent[] }> {
  assertPermission(auth, 'oncology:view');
  if (!UUID_RE.test(patientId)) throw badRequest('patientId 非法');
  const [cycles, aes] = await Promise.all([listCycles(patientId), listAdverseEvents(patientId)]);
  return { cycles, aes };
}
