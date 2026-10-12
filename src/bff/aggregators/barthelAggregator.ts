/**
 * 健澜科技 jlmedaios - Barthel ADL 聚合器（M35-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { getVisitById, type Visit } from '../../db/repositories/visitRepo.js';
import { canAccessVisit } from './inpatientCareAggregator.js';
import { create, listByVisit, type Barthel } from '../../db/repositories/barthelRepo.js';
import { barthelTotal, barthelLevel, type BarthelItems } from '../../medical-tools/nursing/barthelAdl.js';

export class BarthelError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message); this.name = 'BarthelError';
  }
}
const badRequest = (m: string) => new BarthelError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new BarthelError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new BarthelError(403, 'FORBIDDEN', m);

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

export async function recordBarthelView(
  auth: AuthView,
  inp: { visitId: string; note?: string | null } & BarthelItems,
): Promise<Barthel> {
  assertPermission(auth, 'barthel:assess');
  if (!UUID_RE.test(inp.visitId)) throw badRequest('visitId 非法');
  const visit = await loadVisit(auth, inp.visitId);
  const total = barthelTotal(inp);
  const level = barthelLevel(total);
  const rec = await withTx(async (tx) => {
    const r = await create({
      visitId: inp.visitId,
      feeding: inp.feeding, bathing: inp.bathing, grooming: inp.grooming, dressing: inp.dressing,
      bowel: inp.bowel, bladder: inp.bladder, toileting: inp.toileting,
      transfer: inp.transfer, walking: inp.walking, stairs: inp.stairs,
      totalScore: total, dependencyLevel: level,
      note: inp.note ?? null, createdBy: auth.id,
    }, tx);
    await recordChainAudit({
      actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
      action: 'barthel.assess', resourceType: 'barthel_assessment', resourceId: r.id,
      patientRef: visit.patientId, visitRef: visit.id, result: 'success',
      detail: { total, level },
    }, tx);
    return r;
  });
  return rec;
}

export async function listBarthelView(auth: AuthView, visitId: string): Promise<Barthel[]> {
  assertPermission(auth, 'barthel:view');
  if (!UUID_RE.test(visitId)) throw notFound('visitId 非法');
  await loadVisit(auth, visitId);
  return listByVisit(visitId);
}
