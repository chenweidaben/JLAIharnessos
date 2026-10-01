/**
 * 健澜科技 jlmedaios - 互联网在线支付 Repository（M3-M）
 *
 * online_payments / e_invoices 读写。
 *
 * 并发与一致性：
 *  - 支付单幂等：idempotency_key 唯一 + 一来源一张在途支付单（部分唯一索引）；
 *  - 状态机 CAS：pending→processing→paid / failed / cancelled，paid 不可逆；
 *  - 支付回调幂等：channel_txn_no 唯一，重复回调返回 0 行 → 上层 409/幂等返回；
 *  - 票据幂等：一张支付单仅一张有效票据（部分唯一索引），invoice_no 唯一。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, withTx, type DbExecutor } from '../pool.js';
import { toJson } from './helpers.js';

/* -------------------------------- 类型 -------------------------------- */

export type OnlinePaymentStatus =
  | 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';

export interface OnlinePayment {
  id: string;
  payNo: string;
  sourceType: 'internet_prescription';
  sourceId: string;
  patientId: string;
  accountId: string;
  amount: string;
  medicarePaid: string;
  selfPaid: string;
  channel: string;
  status: OnlinePaymentStatus;
  idempotencyKey: string;
  channelTxnNo: string | null;
  paidBy: string | null;
  paidAt: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EInvoice {
  id: string;
  invoiceNo: string;
  paymentId: string;
  patientId: string;
  sourceType: 'internet_prescription';
  sourceId: string;
  amount: string;
  medicarePaid: string;
  selfPaid: string;
  status: 'issued' | 'reversed';
  reversalOf: string | null;
  reversedAt: string | null;
  issuedBy: string | null;
  issuedAt: string;
  createdAt: string;
}

export interface OnlinePaymentCreateInput {
  payNo: string;
  sourceType: 'internet_prescription';
  sourceId: string;
  patientId: string;
  accountId: string;
  amount: number;
  medicarePaid: number;
  selfPaid: number;
  channel: string;
  idempotencyKey: string;
}

/* -------------------------------- 映射 -------------------------------- */

function mapPayment(r: Record<string, unknown>): OnlinePayment {
  return {
    id: String(r.id),
    payNo: String(r.pay_no),
    sourceType: r.source_type as OnlinePayment['sourceType'],
    sourceId: String(r.source_id),
    patientId: String(r.patient_id),
    accountId: String(r.account_id),
    amount: String(r.amount),
    medicarePaid: String(r.medicare_paid),
    selfPaid: String(r.self_paid),
    channel: String(r.channel),
    status: r.status as OnlinePaymentStatus,
    idempotencyKey: String(r.idempotency_key),
    channelTxnNo: r.channel_txn_no ? String(r.channel_txn_no) : null,
    paidBy: r.paid_by ? String(r.paid_by) : null,
    paidAt: r.paid_at ? String(r.paid_at) : null,
    cancelledBy: r.cancelled_by ? String(r.cancelled_by) : null,
    cancelledAt: r.cancelled_at ? String(r.cancelled_at) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function mapInvoice(r: Record<string, unknown>): EInvoice {
  return {
    id: String(r.id),
    invoiceNo: String(r.invoice_no),
    paymentId: String(r.payment_id),
    patientId: String(r.patient_id),
    sourceType: r.source_type as EInvoice['sourceType'],
    sourceId: String(r.source_id),
    amount: String(r.amount),
    medicarePaid: String(r.medicare_paid),
    selfPaid: String(r.self_paid),
    status: r.status as EInvoice['status'],
    reversalOf: r.reversal_of ? String(r.reversal_of) : null,
    reversedAt: r.reversed_at ? String(r.reversed_at) : null,
    issuedBy: r.issued_by ? String(r.issued_by) : null,
    issuedAt: String(r.issued_at),
    createdAt: String(r.created_at),
  };
}

/* -------------------------------- 支付单 -------------------------------- */

export async function createOnlinePayment(
  input: OnlinePaymentCreateInput,
  db?: DbExecutor,
): Promise<OnlinePayment> {
  const d = db ?? getDb();
  const rows = await d`
    INSERT INTO clinical.online_payments
      (pay_no, source_type, source_id, patient_id, account_id,
       amount, medicare_paid, self_paid, channel, idempotency_key)
    VALUES
      (${input.payNo}, ${input.sourceType}, ${input.sourceId}, ${input.patientId}, ${input.accountId},
       ${input.amount}, ${input.medicarePaid}, ${input.selfPaid}, ${input.channel}, ${input.idempotencyKey})
    RETURNING *
  `;
  return mapPayment(rows[0] as Record<string, unknown>);
}

export async function getOnlinePaymentById(id: string, db?: DbExecutor): Promise<OnlinePayment | null> {
  const d = db ?? getDb();
  const rows = await d`SELECT * FROM clinical.online_payments WHERE id = ${id}`;
  return rows.length > 0 ? mapPayment(rows[0] as Record<string, unknown>) : null;
}

export async function getOnlinePaymentByPayNo(payNo: string): Promise<OnlinePayment | null> {
  const rows = await getDb()`SELECT * FROM clinical.online_payments WHERE pay_no = ${payNo}`;
  return rows.length > 0 ? mapPayment(rows[0] as Record<string, unknown>) : null;
}

export async function getOnlinePaymentByIdempotency(key: string): Promise<OnlinePayment | null> {
  const rows = await getDb()`SELECT * FROM clinical.online_payments WHERE idempotency_key = ${key}`;
  return rows.length > 0 ? mapPayment(rows[0] as Record<string, unknown>) : null;
}

/** 一来源的在途支付单（pending/processing） */
export async function getOpenPaymentBySource(
  sourceType: string, sourceId: string,
): Promise<OnlinePayment | null> {
  const rows = await getDb()`
    SELECT * FROM clinical.online_payments
    WHERE source_type = ${sourceType} AND source_id = ${sourceId}
      AND status IN ('pending','processing')
    LIMIT 1
  `;
  return rows.length > 0 ? mapPayment(rows[0] as Record<string, unknown>) : null;
}

/** CAS 状态推进：仅 from 状态可转 to，行锁防并发。返回 null 表示状态冲突。 */
export async function transitionPayment(
  id: string,
  from: OnlinePaymentStatus[],
  to: OnlinePaymentStatus,
  patch: Partial<{
    channelTxnNo: string | null;
    paidBy: string | null;
    paidAt: string | null;
    cancelledBy: string | null;
    cancelledAt: string | null;
  }>,
  db?: DbExecutor,
): Promise<OnlinePayment | null> {
  const d = db ?? getDb();
  const rows = await d`
    UPDATE clinical.online_payments
    SET status = ${to},
        channel_txn_no = COALESCE(${patch.channelTxnNo ?? null}, channel_txn_no),
        paid_by = COALESCE(${patch.paidBy ?? null}, paid_by),
        paid_at = COALESCE(${patch.paidAt ?? null}, paid_at),
        cancelled_by = COALESCE(${patch.cancelledBy ?? null}, cancelled_by),
        cancelled_at = COALESCE(${patch.cancelledAt ?? null}, cancelled_at),
        updated_at = now()
    WHERE id = ${id} AND status IN ${d([...from])}
    RETURNING *
  `;
  return rows.length > 0 ? mapPayment(rows[0] as Record<string, unknown>) : null;
}

export async function listPaymentsByPatient(accountId: string, patientId: string): Promise<OnlinePayment[]> {
  const rows = await getDb()`
    SELECT * FROM clinical.online_payments
    WHERE account_id = ${accountId} AND patient_id = ${patientId}
    ORDER BY created_at DESC
  `;
  return rows.map((r) => mapPayment(r as Record<string, unknown>));
}

export async function listPaymentsForFinance(
  status?: OnlinePaymentStatus | 'all',
): Promise<OnlinePayment[]> {
  const rows = status && status !== 'all'
    ? await getDb()`SELECT * FROM clinical.online_payments WHERE status = ${status} ORDER BY created_at DESC`
    : await getDb()`SELECT * FROM clinical.online_payments ORDER BY created_at DESC`;
  return rows.map((r) => mapPayment(r as Record<string, unknown>));
}

/* -------------------------------- 电子票据 -------------------------------- */

export async function createEInvoice(
  input: {
    invoiceNo: string;
    paymentId: string;
    patientId: string;
    sourceType: 'internet_prescription';
    sourceId: string;
    amount: number;
    medicarePaid: number;
    selfPaid: number;
    issuedBy: string;
  },
  db?: DbExecutor,
): Promise<EInvoice> {
  const d = db ?? getDb();
  const rows = await d`
    INSERT INTO clinical.e_invoices
      (invoice_no, payment_id, patient_id, source_type, source_id,
       amount, medicare_paid, self_paid, issued_by)
    VALUES
      (${input.invoiceNo}, ${input.paymentId}, ${input.patientId}, ${input.sourceType}, ${input.sourceId},
       ${input.amount}, ${input.medicarePaid}, ${input.selfPaid}, ${input.issuedBy})
    RETURNING *
  `;
  return mapInvoice(rows[0] as Record<string, unknown>);
}

export async function getEInvoiceByPaymentId(paymentId: string): Promise<EInvoice | null> {
  const rows = await getDb()`SELECT * FROM clinical.e_invoices WHERE payment_id = ${paymentId}`;
  return rows.length > 0 ? mapInvoice(rows[0] as Record<string, unknown>) : null;
}

export async function getEInvoiceById(id: string): Promise<EInvoice | null> {
  const rows = await getDb()`SELECT * FROM clinical.e_invoices WHERE id = ${id}`;
  return rows.length > 0 ? mapInvoice(rows[0] as Record<string, unknown>) : null;
}

/** 冲红：issued → reversed，绑定 reversal_of（原票据 id），返回 null 表示状态冲突。 */
export async function reverseEInvoice(
  id: string,
  reversedBy: string,
  db?: DbExecutor,
): Promise<EInvoice | null> {
  const d = db ?? getDb();
  const rows = await d`
    UPDATE clinical.e_invoices
    SET status = 'reversed',
        reversal_of = ${id},
        reversed_at = now(),
        issued_by = COALESCE(issued_by, ${reversedBy})
    WHERE id = ${id} AND status = 'issued'
    RETURNING *
  `;
  return rows.length > 0 ? mapInvoice(rows[0] as Record<string, unknown>) : null;
}

export async function listInvoicesByPatient(accountId: string, patientId: string): Promise<EInvoice[]> {
  const rows = await getDb()`
    SELECT ei.* FROM clinical.e_invoices ei
    JOIN clinical.online_payments op ON op.id = ei.payment_id
    WHERE op.account_id = ${accountId} AND ei.patient_id = ${patientId}
    ORDER BY ei.issued_at DESC
  `;
  return rows.map((r) => mapInvoice(r as Record<string, unknown>));
}

export async function listInvoicesForFinance(status?: 'issued' | 'reversed' | 'all'): Promise<EInvoice[]> {
  const rows = status && status !== 'all'
    ? await getDb()`SELECT * FROM clinical.e_invoices WHERE status = ${status} ORDER BY issued_at DESC`
    : await getDb()`SELECT * FROM clinical.e_invoices ORDER BY issued_at DESC`;
  return rows.map((r) => mapInvoice(r as Record<string, unknown>));
}

/* 审计辅助：toJson 由 helpers 提供（保持导入可用） */
export const _auditJson = toJson;
