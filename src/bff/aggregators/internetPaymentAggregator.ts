/**
 * 健澜科技 jlmedaios - 互联网在线支付聚合器（M3-M）
 *
 * 闭环：患者为已审方通过的电子处方发起在线支付
 *   → 支付单（医保本地分割：统筹/自付）→ 渠道支付（可插拔提供方）
 *   → 支付确认（mock 渠道下单即成功；真实渠道回调确认）
 *   → 处方状态 approved→paid → 开具电子票据 → 财务冲正（票据冲红）。
 *
 * 医保计费口径（与 M3-G 一致）：本地确定性计算（统筹 60% / 自付 40%），
 * 不接外部医保平台；规则常量可配置，真实医保由外部系统对接。
 *
 * 安全约束：
 *  - 仅本人（account_id + patient_id）可发起/查看本人支付与票据；
 *  - 仅已审方通过（approved）处方可支付；重复发起（幂等键/在途支付单）409；
 *  - 支付回调幂等：channel_txn_no 唯一 + 状态机 CAS；
 *  - 冲正仅财务/药师（internet:payment:refund），票据冲红同事务。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { listProfiles as listProfilesRepo } from '../../db/repositories/internetPatientRepo.js';
import { getEPrescriptionById, type EPrescription } from '../../db/repositories/internetPrescriptionRepo.js';
import {
  createOnlinePayment,
  getOnlinePaymentById,
  getOnlinePaymentByIdempotency,
  getOpenPaymentBySource,
  transitionPayment,
  listPaymentsByPatient,
  listPaymentsForFinance,
  createEInvoice,
  getEInvoiceByPaymentId,
  reverseEInvoice,
  listInvoicesByPatient,
  listInvoicesForFinance,
  type OnlinePayment,
  type EInvoice,
} from '../../db/repositories/internetPaymentRepo.js';
import { createPaymentProvider, type PaymentChannel } from '../providers/paymentProviders.js';
import type { AuthView } from '../view/userView.js';

export class InternetPaymentError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'InternetPaymentError';
  }
}
const badRequest = (m: string) => new InternetPaymentError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new InternetPaymentError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new InternetPaymentError(403, 'FORBIDDEN', m);
const conflict = (m: string) => new InternetPaymentError(409, 'CONFLICT', m);

/** 医保本地计费：统筹 60% / 自付 40%（确定性规则，可配置常量）。 */
export const MEDICARE_POOL_RATIO = 0.6;
function splitMedicare(amount: number): { medicarePaid: number; selfPaid: number } {
  const medicarePaid = Math.round(amount * MEDICARE_POOL_RATIO * 100) / 100;
  const selfPaid = Math.round((amount - medicarePaid) * 100) / 100;
  return { medicarePaid, selfPaid };
}

const genPayNo = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `OP${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${Math.floor(100000 + Math.random() * 900000)}`;
};
const genInvoiceNo = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `INV${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${Math.floor(100000 + Math.random() * 900000)}`;
};

async function assertRxPayable(prescriptionId: string): Promise<EPrescription> {
  const rx = await getEPrescriptionById(prescriptionId);
  if (!rx) throw notFound('电子处方不存在');
  if (rx.status !== 'approved') {
    throw conflict(`仅已审方通过的处方可支付，当前状态 ${rx.status}`);
  }
  if (rx.totalFee == null || Number(rx.totalFee) <= 0) {
    throw badRequest('处方金额无效，无法支付');
  }
  return rx;
}

/** 患者：解析本人实名患者 ID（就诊人建档实名后返回 patient_id）。 */
export async function getPatientIdByAccount(accountId: string): Promise<string | null> {
  const profiles = await listProfilesRepo(accountId);
  const withPatient = profiles.find((p) => p.patientId);
  return withPatient?.patientId ?? null;
}

/** 患者：发起在线支付（本人归属强校验）。mock 渠道下单即完成闭环。 */
export async function createPaymentByPatient(
  accountId: string,
  patientId: string,
  input: { prescriptionId: string; channel: PaymentChannel; idempotencyKey: string },
): Promise<{ payment: OnlinePayment; invoice: EInvoice | null; rx: EPrescription }> {
  if (!input.prescriptionId?.trim()) throw badRequest('缺少处方 ID');
  if (!input.idempotencyKey?.trim()) throw badRequest('缺少幂等键');
  const rx = await getEPrescriptionById(input.prescriptionId);
  if (!rx) throw notFound('电子处方不存在');
  // 归属校验先于状态校验：他人访问他人资源一律 403，不泄露资源状态
  if (rx.accountId !== accountId || rx.patientId !== patientId) {
    throw forbidden('仅本人处方可发起支付');
  }
  await assertRxPayable(input.prescriptionId);

  const dup = await getOnlinePaymentByIdempotency(input.idempotencyKey);
  if (dup) throw conflict('该支付请求已提交（幂等键重复）');
  const open = await getOpenPaymentBySource('internet_prescription', rx.id);
  if (open) throw conflict(`该处方已有在途支付单（${open.payNo}）`);

  const amount = Number(rx.totalFee);
  const { medicarePaid, selfPaid } = splitMedicare(amount);
  const provider = createPaymentProvider(input.channel);

  return withTx(async (tx) => {
    const payNo = genPayNo();
    const payment = await createOnlinePayment(
      {
        payNo,
        sourceType: 'internet_prescription',
        sourceId: rx.id,
        patientId: rx.patientId,
        accountId,
        amount,
        medicarePaid,
        selfPaid,
        channel: input.channel,
        idempotencyKey: input.idempotencyKey,
      },
      tx,
    );

    // 调渠道下单（mock 立即成功；真实渠道待回调）
    const res = await provider.createPayment({ payNo, amount, subject: `互联网电子处方 ${rx.rxNo}` });

    let invoice: EInvoice | null = null;
    if (res.settled) {
      // 同事务完成：支付确认 → 处方 paid → 开票
      const paid = await transitionPayment(
        payment.id,
        ['pending'],
        'paid',
        { channelTxnNo: res.txnNo, paidBy: accountId, paidAt: new Date().toISOString() },
        tx,
      );
      if (!paid) throw conflict('支付单状态已变化，请刷新后重试');
      await tx`UPDATE clinical.internet_prescriptions SET status = 'paid', updated_at = now() WHERE id = ${rx.id}`;
      invoice = await createEInvoice(
        {
          invoiceNo: genInvoiceNo(),
          paymentId: paid.id,
          patientId: rx.patientId,
          sourceType: 'internet_prescription',
          sourceId: rx.id,
          amount,
          medicarePaid,
          selfPaid,
          issuedBy: accountId,
        },
        tx,
      );
    } else {
      await transitionPayment(
        payment.id,
        ['pending'],
        'processing',
        { channelTxnNo: res.txnNo },
        tx,
      );
    }

    await recordChainAudit(
      {
        actorId: accountId,
        actorRole: 'patient',
        actorDept: 'internet',
        action: 'internet.payment_create',
        resourceType: 'online_payment',
        resourceId: payment.id,
        patientRef: rx.patientId,
        result: 'success',
        riskLevel: 'medium',
        detail: { payNo, rxNo: rx.rxNo, amount, medicarePaid, selfPaid, channel: input.channel, txnNo: res.txnNo },
      },
      tx,
    );

    const finalPayment = await getOnlinePaymentById(payment.id, tx);
    // 支付后处方已推进为 paid（或仍 approved 等待真实渠道回调），事务内读最新状态
    const finalRx = (await getEPrescriptionById(rx.id, tx)) ?? rx;
    return { payment: finalPayment!, invoice, rx: finalRx };
  });
}

/** 患者：取消在途支付单（pending/processing → cancelled，未支付）。 */
export async function cancelPaymentByPatient(
  accountId: string,
  patientId: string,
  paymentId: string,
): Promise<OnlinePayment> {
  return withTx(async (tx) => {
    const p = await getOnlinePaymentById(paymentId, tx);
    if (!p) throw notFound('支付单不存在');
    if (p.accountId !== accountId || p.patientId !== patientId) {
      throw forbidden('仅本人可取消支付单');
    }
    if (p.status === 'paid') throw conflict('支付已完成，不可取消（请走冲正）');
    const updated = await transitionPayment(
      paymentId,
      ['pending', 'processing'],
      'cancelled',
      { cancelledBy: accountId, cancelledAt: new Date().toISOString() },
      tx,
    );
    if (!updated) throw conflict(`当前状态 ${p.status} 不可取消`);
    await recordChainAudit(
      {
        actorId: accountId,
        actorRole: 'patient',
        actorDept: 'internet',
        action: 'internet.payment_cancel',
        resourceType: 'online_payment',
        resourceId: paymentId,
        patientRef: p.patientId,
        result: 'success',
        riskLevel: 'low',
        detail: { payNo: p.payNo, status: 'cancelled' },
      },
      tx,
    );
    return updated;
  });
}

/** 财务/药师：冲正已支付处方（支付单 → 票据冲红，同事务）。 */
export async function refundPaymentByFinance(
  auth: AuthView,
  paymentId: string,
  reason: string,
): Promise<{ payment: OnlinePayment; invoice: EInvoice | null }> {
  if (!reason?.trim()) throw badRequest('冲正必须填写原因');
  return withTx(async (tx) => {
    const p = await getOnlinePaymentById(paymentId, tx);
    if (!p) throw notFound('支付单不存在');
    if (p.status !== 'paid') throw conflict(`仅已支付支付单可冲正，当前状态 ${p.status}`);
    const updated = await transitionPayment(
      paymentId,
      ['paid'],
      'cancelled',
      { cancelledBy: auth.id, cancelledAt: new Date().toISOString() },
      tx,
    );
    if (!updated) throw conflict('支付单状态已变化，冲正失败');
    // 处方状态 paid → returned（允许医生修改重提前需重新审方？不——退回审方态，医生可改）
    await tx`UPDATE clinical.internet_prescriptions SET status = 'returned', updated_at = now() WHERE id = ${p.sourceId} AND status = 'paid'`;
    // 票据冲红
    const inv = await getEInvoiceByPaymentId(paymentId);
    let reversedInv: EInvoice | null = null;
    if (inv) {
      reversedInv = await reverseEInvoice(inv.id, auth.id, tx);
    }
    await recordChainAudit(
      {
        actorId: auth.id,
        actorRole: auth.rawRoles.join(','),
        actorDept: auth.deptName,
        action: 'internet.payment_refund',
        resourceType: 'online_payment',
        resourceId: paymentId,
        patientRef: p.patientId,
        result: 'success',
        riskLevel: 'high',
        detail: { payNo: p.payNo, reason, invoiceNo: inv?.invoiceNo ?? null, rxId: p.sourceId },
      },
      tx,
    );
    return { payment: updated, invoice: reversedInv };
  });
}

/** 患者：我的支付单。 */
export async function listMyPayments(accountId: string, patientId: string): Promise<OnlinePayment[]> {
  return listPaymentsByPatient(accountId, patientId);
}

/** 患者：我的电子票据。 */
export async function listMyInvoices(accountId: string, patientId: string): Promise<EInvoice[]> {
  return listInvoicesByPatient(accountId, patientId);
}

/** 财务/药师：支付队列。 */
export async function listFinancePayments(status?: 'pending' | 'processing' | 'paid' | 'cancelled' | 'all') {
  return listPaymentsForFinance(status ?? 'all');
}

/** 财务/药师：票据队列。 */
export async function listFinanceInvoices(status?: 'issued' | 'reversed' | 'all') {
  return listInvoicesForFinance(status ?? 'all');
}
