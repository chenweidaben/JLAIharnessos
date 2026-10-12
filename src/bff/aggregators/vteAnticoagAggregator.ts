/**
 * 健澜科技 jlmedaios - VTE 抗凝聚合器（M46-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { createTask, hasOpenTask } from '../../db/repositories/improvementTaskRepo.js';
import { startAnticoag, recordBleedingScore, listByVisit, stopAnticoag, type Anticoag } from '../../db/repositories/vteAnticoagRepo.js';
import { highBleedingRisk } from '../../medical-tools/nursing/vteAnticoag.js';

export class VteError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message); this.name = 'VteError';
  }
}
const badRequest = (m: string) => new VteError(400, 'BAD_REQUEST', m);
const forbidden = (m: string) => new VteError(403, 'FORBIDDEN', m);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function startView(
  auth: AuthView,
  inp: { visitId: string; drug: string; startDate: string; plannedDays: number },
): Promise<Anticoag> {
  if (!auth.permissions.includes('vte:anticoagulate')) throw forbidden('缺少权限：vte:anticoagulate');
  if (!UUID_RE.test(inp.visitId)) throw badRequest('visitId 非法');
  return withTx(async (tx) => {
    const r = await startAnticoag({ ...inp, createdBy: auth.id }, tx);
    await recordChainAudit({
      actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
      action: 'vte.anticoag_start', resourceType: 'vte_anticoagulation', resourceId: r.id,
      patientRef: null, visitRef: r.visitId, result: 'success',
      detail: { drug: r.drug, plannedDays: r.plannedDays },
    }, tx);
    return r;
  });
}

export async function bleedingView(auth: AuthView, id: string, score: number): Promise<Anticoag & { taskId: string | null }> {
  if (!auth.permissions.includes('vte:anticoagulate')) throw forbidden('缺少权限：vte:anticoagulate');
  if (!UUID_RE.test(id)) throw badRequest('id 非法');
  const { rec, taskId } = await withTx(async (tx) => {
    const r = await recordBleedingScore(id, score, tx);
    await recordChainAudit({
      actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
      action: 'vte.bleeding_score', resourceType: 'vte_anticoagulation', resourceId: r.id,
      patientRef: null, visitRef: r.visitId, result: 'success',
      detail: { score },
    }, tx);
    let taskId: string | null = null;
    if (highBleedingRisk(score)) {
      const exists = await hasOpenTask(r.visitId, 'vte', tx);
      if (!exists) {
        const t = await createTask({
          source: 'vte', visitId: r.visitId,
          title: `抗凝出血评分=${score}`,
          finding: `drug=${r.drug} bleeding_score=${score} >= 40`,
          assigneeId: auth.id, createdBy: auth.id,
        }, tx);
        taskId = t.id;
      }
    }
    return { rec: r, taskId };
  });
  return { ...rec, taskId };
}

export async function stopView(auth: AuthView, id: string, endDate: string): Promise<Anticoag> {
  if (!auth.permissions.includes('vte:anticoagulate')) throw forbidden('缺少权限：vte:anticoagulate');
  if (!UUID_RE.test(id)) throw badRequest('id 非法');
  return withTx(async (tx) => {
    const r = await stopAnticoag(id, endDate, tx);
    await recordChainAudit({
      actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
      action: 'vte.anticoag_stop', resourceType: 'vte_anticoagulation', resourceId: r.id,
      patientRef: null, visitRef: r.visitId, result: 'success',
      detail: { endDate },
    }, tx);
    return r;
  });
}

export async function listView(auth: AuthView, visitId: string): Promise<Anticoag[]> {
  if (!auth.permissions.includes('vte:view')) throw forbidden('缺少权限：vte:view');
  if (!UUID_RE.test(visitId)) throw badRequest('visitId 非法');
  return listByVisit(visitId);
}
