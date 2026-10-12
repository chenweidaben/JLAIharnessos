/**
 * 健澜科技 jlmedaios - 体检异常转诊聚合器（M40-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { createReferral, listByOrder, dismissReferral, type Referral } from '../../db/repositories/healthCheckReferralRepo.js';
import { mapFinding } from '../../medical-tools/nursing/healthCheckReferral.js';

export class ReferralError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message); this.name = 'ReferralError';
  }
}
const badRequest = (m: string) => new ReferralError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new ReferralError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new ReferralError(403, 'FORBIDDEN', m);
function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function createReferralView(
  auth: AuthView,
  inp: { orderId: string; abnormalItem: string; findingDetail?: string | null },
): Promise<Referral> {
  assertPermission(auth, 'healthcheck:referral');
  if (!UUID_RE.test(inp.orderId)) throw badRequest('orderId 非法');
  const dept = mapFinding(inp.abnormalItem);
  return withTx(async (tx) => {
    const r = await createReferral({ ...inp, suggestedDepartment: dept }, tx);
    await recordChainAudit({
      actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
      action: 'healthcheck.referral', resourceType: 'healthcheck_referral', resourceId: r.id,
      patientRef: null, visitRef: null, result: 'success',
      detail: { item: r.abnormalItem, dept },
    }, tx);
    return r;
  });
}

export async function listReferralsView(auth: AuthView, orderId: string): Promise<Referral[]> {
  assertPermission(auth, 'healthcheck:referral');
  if (!UUID_RE.test(orderId)) throw badRequest('orderId 非法');
  return listByOrder(orderId);
}

export async function dismissView(auth: AuthView, id: string): Promise<Referral> {
  assertPermission(auth, 'healthcheck:referral');
  if (!UUID_RE.test(id)) throw badRequest('id 非法');
  const r = await dismissReferral(id);
  if (!r) throw notFound('referral 不存在');
  return r;
}
