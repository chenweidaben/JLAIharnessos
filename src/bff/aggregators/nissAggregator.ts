/**
 * 健澜科技 jlmedaios - 院感上报聚合器（M45-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { reportInfection, listActive, getById, updateStatus, type Infection } from '../../db/repositories/nissRepo.js';
import { requiresIsolation, infectionCategory } from '../../medical-tools/nursing/nissReporting.js';
import { needsTask, buildTask } from '../../medical-tools/nursing/nissAlert.js';
import { createTask, hasOpenTask } from '../../db/repositories/improvementTaskRepo.js';

export class NissError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message); this.name = 'NissError';
  }
}
const badRequest = (m: string) => new NissError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new NissError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new NissError(403, 'FORBIDDEN', m);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_STATUS = ['reported', 'under_investigation', 'resolved', 'dismissed'];

export async function reportView(
  auth: AuthView,
  inp: { visitId: string; infectionType: string; pathogen?: string | null; note?: string | null },
): Promise<Infection & { taskId: string | null }> {
  if (!auth.permissions.includes('infection:report')) throw forbidden('缺少权限：infection:report');
  if (!UUID_RE.test(inp.visitId)) throw badRequest('visitId 非法');
  const iso = requiresIsolation(inp.infectionType);
  const { rec, taskId } = await withTx(async (tx) => {
    const r = await reportInfection({ ...inp, isolationRequired: iso, reportedBy: auth.id }, tx);
    await recordChainAudit({
      actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
      action: 'niss.report', resourceType: 'nosocomial_infection', resourceId: r.id,
      patientRef: null, visitRef: r.visitId, result: 'success',
      detail: { type: r.infectionType, category: infectionCategory(r.infectionType), isolation: r.isolationRequired },
    }, tx);
    let taskId: string | null = null;
    if (needsTask(r.infectionType)) {
      const exists = await hasOpenTask(r.visitId, 'infection', tx);
      if (!exists) {
        const t = buildTask(r.infectionType, r.pathogen);
        const tk = await createTask({
          source: 'infection', visitId: r.visitId,
          title: t.title, finding: t.finding,
          assigneeId: auth.id, createdBy: auth.id,
        }, tx);
        taskId = tk.id;
      }
    }
    return { rec: r, taskId };
  });
  return { ...rec, taskId };
}

export async function listView(auth: AuthView): Promise<Infection[]> {
  if (!auth.permissions.includes('infection:view')) throw forbidden('缺少权限：infection:view');
  return listActive();
}

export async function patchStatusView(auth: AuthView, id: string, status: string): Promise<Infection> {
  if (!auth.permissions.includes('infection:view')) throw forbidden('缺少权限：infection:view');
  if (!UUID_RE.test(id)) throw badRequest('id 非法');
  if (!VALID_STATUS.includes(status)) throw badRequest('status 非法');
  const existing = await getById(id);
  if (!existing) throw notFound('院感记录不存在');
  return withTx(async (tx) => {
    const r = await updateStatus(id, status, tx);
    await recordChainAudit({
      actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
      action: 'niss.status', resourceType: 'nosocomial_infection', resourceId: r.id,
      patientRef: null, visitRef: r.visitId, result: 'success',
      detail: { from: existing.status, to: r.status },
    }, tx);
    return r;
  });
}
