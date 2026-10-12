/**
 * 健澜科技 jlmedaios - 病组选择聚合器（M23-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type { AuthView } from '../view/userView.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import {
  getByVisit,
  listSelections,
  overrideSelection,
  upsertSelection,
} from '../../db/repositories/paymentSelectionRepo.js';
import { buildRationale, chooseBetter } from '../../medical-tools/operations/paymentSelection.js';

export class PaymentSelectionError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'PaymentSelectionError';
  }
}
const badRequest = (m: string) => new PaymentSelectionError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new PaymentSelectionError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new PaymentSelectionError(403, 'FORBIDDEN', m);

function assertView(auth: AuthView): void {
  if (!auth.permissions.includes('payment_select:view')) throw forbidden('缺少权限：payment_select:view');
}
function assertAdjust(auth: AuthView): void {
  if (!auth.permissions.includes('payment_select:adjust')) throw forbidden('缺少权限：payment_select:adjust');
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function evaluateView(
  auth: AuthView,
  visitId: string,
  input: { drgExpectedPayment?: number; dipPacketCode?: string; dipScore?: number; dipPointValue?: number },
) {
  assertView(auth);
  if (!UUID_RE.test(visitId.trim())) throw notFound('就诊不存在');
  const drgPayment = input.drgExpectedPayment ?? 0;
  const dipScore = input.dipScore ?? 0;
  const dipPoint = input.dipPointValue ?? 0;
  const dipPayment = dipScore * dipPoint;
  const path = chooseBetter(drgPayment, dipPayment);
  const rationale = buildRationale(drgPayment, dipPayment, path);
  const r = await upsertSelection({
    visitId, drgExpectedPayment: drgPayment,
    dipPacketCode: input.dipPacketCode ?? null, dipScore, dipPointValue: dipPoint, dipPayment,
    selectedPath: path, rationale,
  });
  await recordChainAudit({ actorId: auth.id, action: 'payment.evaluate', resourceType: 'payment_group_selection', resourceId: r.id, result: 'success', riskLevel: 'low', detail: { visitId, path } });
  return r;
}

export async function getView(auth: AuthView, visitId: string) {
  assertView(auth);
  if (!UUID_RE.test(visitId.trim())) throw notFound('就诊不存在');
  const r = await getByVisit(visitId);
  if (!r) throw notFound('尚未评估');
  return r;
}

export async function listView(auth: AuthView) {
  assertView(auth);
  return listSelections();
}

export async function overrideView(auth: AuthView, visitId: string, input: { selectedPath: string }) {
  assertAdjust(auth);
  if (!UUID_RE.test(visitId.trim())) throw notFound('就诊不存在');
  if (!['drg', 'dip', 'manual'].includes(input.selectedPath)) throw badRequest('selectedPath 非法');
  const existing = await getByVisit(visitId);
  if (!existing) throw notFound('尚未评估');
  const r = await overrideSelection(visitId, input.selectedPath, auth.id);
  await recordChainAudit({ actorId: auth.id, action: 'payment.override', resourceType: 'payment_group_selection', resourceId: r.id, result: 'success', riskLevel: 'high', detail: { visitId, selectedPath: input.selectedPath } });
  return r;
}
