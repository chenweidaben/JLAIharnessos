/**
 * 健澜科技 jlmedaios - 续方流转聚合器（M21-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type { AuthView } from '../view/userView.js';
import { withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { canRenew, nextStatus } from '../../medical-tools/internet/renewalFlow.js';
import {
  createRenewalPrescription,
  getRenewalById,
  listByPatient,
  transitionStatus,
  type RenewalRow,
} from '../../db/repositories/renewalFlowRepo.js';

export class RenewalError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'RenewalError';
  }
}
const badRequest = (m: string) => new RenewalError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new RenewalError(404, 'NOT_FOUND', m);
const conflict = (m: string) => new RenewalError(409, 'CONFLICT', m);
const forbidden = (m: string) => new RenewalError(403, 'FORBIDDEN', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 医生对已 completed 会话发起续方。 */
export async function prescribeView(
  auth: AuthView,
  input: { sessionId: string; patientId: string; accountId: string; profileId: string; department?: string | null; rxNo: string; idempotencyKey: string; priorRxId?: string | null; totalFee?: number | null; sessionStatus?: string; hasPriorRx?: boolean },
): Promise<RenewalRow> {
  assertPermission(auth, 'renewal:prescribe');
  if (!UUID_RE.test(input.sessionId.trim())) throw badRequest('会话 ID 非法');
  if (!canRenew({ sessionStatus: input.sessionStatus ?? 'completed', hasPriorRx: input.hasPriorRx ?? true })) {
    throw badRequest('会话未完成或无既往处方，不可续方');
  }
  return withTx(async (tx) => {
    const r = await createRenewalPrescription({ ...input, prescriberId: auth.id }, tx);
    await recordChainAudit(
      { actorId: auth.id, action: 'renewal.prescribe', resourceType: 'internet_prescription', resourceId: r.id, result: 'success', riskLevel: 'medium', detail: { rxNo: r.rxNo, sessionId: input.sessionId } },
      tx,
    );
    return r;
  });
}

/** 患者列自己续方处方。 */
export async function listMineView(auth: AuthView, patientId: string) {
  if (!UUID_RE.test(patientId.trim())) throw badRequest('患者 ID 非法');
  return listByPatient(patientId);
}

/** 患者支付：approved → paid。 */
export async function payView(auth: AuthView, rxId: string): Promise<RenewalRow> {
  assertPermission(auth, 'renewal:pay');
  if (!UUID_RE.test(rxId.trim())) throw notFound('处方不存在');
  const before = await getRenewalById(rxId);
  if (!before) throw notFound('处方不存在');
  const next = nextStatus(before.status, 'pay');
  if (!next) throw conflict(`状态 ${before.status} 不可支付`);
  return withTx(async (tx) => {
    const r = await transitionStatus(rxId, before.status, next, tx);
    if (!r) throw conflict('状态已变更');
    await recordChainAudit(
      { actorId: auth.id, action: 'renewal.pay', resourceType: 'internet_prescription', resourceId: rxId, result: 'success', riskLevel: 'low', detail: { from: before.status, to: next } },
      tx,
    );
    return r;
  });
}

/** 药师配药：paid → ready_dispense。 */
export async function dispenseView(auth: AuthView, rxId: string): Promise<RenewalRow> {
  if (!UUID_RE.test(rxId.trim())) throw notFound('处方不存在');
  const before = await getRenewalById(rxId);
  if (!before) throw notFound('处方不存在');
  const next = nextStatus(before.status, 'dispense');
  if (!next) throw conflict(`状态 ${before.status} 不可配药`);
  return withTx(async (tx) => {
    const r = await transitionStatus(rxId, before.status, next, tx);
    if (!r) throw conflict('状态已变更');
    await recordChainAudit(
      { actorId: auth.id, action: 'renewal.dispense', resourceType: 'internet_prescription', resourceId: rxId, result: 'success', riskLevel: 'low', detail: { from: before.status, to: next } },
      tx,
    );
    return r;
  });
}
