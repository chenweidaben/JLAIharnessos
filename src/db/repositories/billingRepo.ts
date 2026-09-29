/**
 * 健澜科技 jlmedaios - 收费结算 Repository（M3-B）
 *
 * charge_item_catalog / fee_items / settlements / invoices / refunds /
 * billing_saga_log 读写。
 *
 * 并发与一致性：
 *  - 费用幂等：ON CONFLICT DO NOTHING，同一来源（source_type, source_id）只生成一条；
 *  - 收款/退费：SELECT ... FOR UPDATE 行锁 + 条件式 UPDATE（status 白名单），
 *    重复收款/重复退费返回 0 行，上层抛 409；
 *  - 结算单版本号乐观锁 version；一个就诊同时只允许一张在途结算单（部分唯一索引）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';
import { toJson } from './helpers.js';

/* -------------------------------- 类型 -------------------------------- */

export type ChargeCategory =
  | 'registration' | 'consultation' | 'lab' | 'imaging'
  | 'treatment' | 'bed' | 'nursing' | 'surgery' | 'material' | 'other';

export type FeeCategory = ChargeCategory | 'drug';
export type FeeSourceType =
  | 'registration' | 'consultation' | 'lab' | 'imaging' | 'drug'
  | 'treatment' | 'nursing' | 'bed' | 'surgery' | 'material' | 'other';
export type FeeItemStatus = 'active' | 'settled' | 'refunded' | 'void';
export type SettlementStatus =
  | 'unpaid' | 'paid' | 'partially_refunded' | 'refunded' | 'void';
export type PaymentMethod =
  | 'cash' | 'wechat' | 'alipay' | 'bank_card' | 'insurance' | 'mixed';

export interface ChargeItem {
  id: string;
  code: string;
  name: string;
  category: ChargeCategory;
  unit: string;
  price: string;
  aliases: string[];
  status: string;
}

export interface FeeItem {
  id: string;
  patientId: string;
  visitId: string;
  category: FeeCategory;
  itemCode: string | null;
  itemName: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  sourceType: FeeSourceType;
  sourceId: string | null;
  priceSource: 'catalog' | 'drug' | 'default' | 'manual';
  status: FeeItemStatus;
  settlementId: string | null;
  department: string;
  createdAt: string;
  updatedAt: string;
}

export interface Settlement {
  id: string;
  settlementNo: string;
  patientId: string;
  visitId: string;
  department: string;
  status: SettlementStatus;
  version: number;
  paymentMethod: PaymentMethod;
  totalAmount: string;
  paidAmount: string;
  refundedAmount: string;
  paidBy: string | null;
  paidAt: string | null;
  voidedBy: string | null;
  voidedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  settlementId: string;
  patientId: string;
  visitId: string;
  invoiceType: 'electronic' | 'paper';
  totalAmount: string;
  refundedAmount: string;
  status: 'issued' | 'void';
  issuedBy: string | null;
  issuedAt: string;
  voidedAt: string | null;
  createdAt: string;
}

export interface Refund {
  id: string;
  refundNo: string;
  settlementId: string;
  invoiceId: string | null;
  patientId: string;
  visitId: string;
  feeItemId: string;
  amount: string;
  reason: string;
  refundedBy: string | null;
  refundedAt: string;
  createdAt: string;
}

/* ------------------------------ 列与映射 ------------------------------ */

const CHARGE_COLS = `id, code, name, category, unit, price, aliases, status`;
const FEE_COLS = `
  id, patient_id, visit_id, category, item_code, item_name, quantity, unit_price, amount,
  source_type, source_id, price_source, status, settlement_id, department, created_at, updated_at
`;
const SETTLEMENT_COLS = `
  id, settlement_no, patient_id, visit_id, department, status, version, payment_method,
  total_amount, paid_amount, refunded_amount, paid_by, paid_at,
  voided_by, voided_at, created_at, updated_at
`;
const INVOICE_COLS = `
  id, invoice_no, settlement_id, patient_id, visit_id, invoice_type,
  total_amount, refunded_amount, status, issued_by, issued_at, voided_at, created_at
`;
const REFUND_COLS = `
  id, refund_no, settlement_id, invoice_id, patient_id, visit_id, fee_item_id,
  amount, reason, refunded_by, refunded_at, created_at
`;

function asArray(v: unknown): string[] {
  if (Array.isArray(v)) return v as string[];
  if (typeof v === 'string' && v.trim()) {
    try {
      const p: unknown = JSON.parse(v);
      return Array.isArray(p) ? (p as string[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapCharge(row: Record<string, unknown>): ChargeItem {
  return {
    id: String(row.id), code: String(row.code), name: String(row.name),
    category: row.category as ChargeCategory, unit: String(row.unit),
    price: String(row.price), aliases: asArray(row.aliases), status: String(row.status),
  };
}

function mapFee(row: Record<string, unknown>): FeeItem {
  return {
    id: String(row.id), patientId: String(row.patient_id),
    visitId: String(row.visit_id), category: row.category as FeeCategory,
    itemCode: row.item_code ? String(row.item_code) : null,
    itemName: String(row.item_name),
    quantity: String(row.quantity), unitPrice: String(row.unit_price),
    amount: String(row.amount), sourceType: row.source_type as FeeSourceType,
    sourceId: row.source_id ? String(row.source_id) : null,
    priceSource: row.price_source as FeeItem['priceSource'],
    status: row.status as FeeItemStatus,
    settlementId: row.settlement_id ? String(row.settlement_id) : null,
    department: String(row.department),
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

function mapSettlement(row: Record<string, unknown>): Settlement {
  return {
    id: String(row.id), settlementNo: String(row.settlement_no),
    patientId: String(row.patient_id), visitId: String(row.visit_id),
    department: String(row.department), status: row.status as SettlementStatus,
    version: Number(row.version), paymentMethod: row.payment_method as PaymentMethod,
    totalAmount: String(row.total_amount), paidAmount: String(row.paid_amount),
    refundedAmount: String(row.refunded_amount),
    paidBy: row.paid_by ? String(row.paid_by) : null,
    paidAt: row.paid_at ? String(row.paid_at) : null,
    voidedBy: row.voided_by ? String(row.voided_by) : null,
    voidedAt: row.voided_at ? String(row.voided_at) : null,
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

function mapInvoice(row: Record<string, unknown>): Invoice {
  return {
    id: String(row.id), invoiceNo: String(row.invoice_no),
    settlementId: String(row.settlement_id), patientId: String(row.patient_id),
    visitId: String(row.visit_id), invoiceType: row.invoice_type as Invoice['invoiceType'],
    totalAmount: String(row.total_amount), refundedAmount: String(row.refunded_amount),
    status: row.status as Invoice['status'],
    issuedBy: row.issued_by ? String(row.issued_by) : null,
    issuedAt: String(row.issued_at),
    voidedAt: row.voided_at ? String(row.voided_at) : null,
    createdAt: String(row.created_at),
  };
}

function mapRefund(row: Record<string, unknown>): Refund {
  return {
    id: String(row.id), refundNo: String(row.refund_no),
    settlementId: String(row.settlement_id),
    invoiceId: row.invoice_id ? String(row.invoice_id) : null,
    patientId: String(row.patient_id), visitId: String(row.visit_id),
    feeItemId: String(row.fee_item_id), amount: String(row.amount),
    reason: String(row.reason),
    refundedBy: row.refunded_by ? String(row.refunded_by) : null,
    refundedAt: String(row.refunded_at), createdAt: String(row.created_at),
  };
}

/* ------------------------------ 单号生成 ------------------------------ */

function ymd(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}
const suffix = () => String(Math.floor(Math.random() * 900_000) + 100_000);
export const generateSettlementNo = () => `JS${ymd()}${suffix()}`;
export const generateInvoiceNo = () => `FP${ymd()}${suffix()}`;
export const generateRefundNo = () => `TF${ymd()}${suffix()}`;

/* ============================== 价表查询 ============================== */

export async function listChargeCatalog(
  category?: ChargeCategory,
  sql?: DbExecutor,
): Promise<ChargeItem[]> {
  const db = sql ?? getDb();
  const rows = category
    ? await db`SELECT ${db.unsafe(CHARGE_COLS)} FROM clinical.charge_item_catalog
               WHERE category = ${category} AND status='active' ORDER BY code`
    : await db`SELECT ${db.unsafe(CHARGE_COLS)} FROM clinical.charge_item_catalog
               WHERE status='active' ORDER BY code`;
  return (rows as Record<string, unknown>[]).map(mapCharge);
}

/* ============================== 费用明细 ============================== */

export interface FeeItemCreateInput {
  patientId: string;
  visitId: string;
  category: FeeCategory;
  itemCode?: string | null;
  itemName: string;
  quantity?: number | string;
  unitPrice: number | string;
  sourceType: FeeSourceType;
  sourceId?: string | null;
  priceSource?: FeeItem['priceSource'];
  department: string;
}

/**
 * 幂等插入费用明细（ON CONFLICT DO NOTHING）。
 * 同一来源重复计费：0 行 INSERT 后回查既有行，返回 { item, created:false }。
 */
export async function insertFeeItem(
  input: FeeItemCreateInput,
  tx: DbExecutor,
): Promise<{ item: FeeItem; created: boolean }> {
  const inserted = await tx`
    INSERT INTO clinical.fee_items (
      patient_id, visit_id, category, item_code, item_name, quantity, unit_price,
      source_type, source_id, price_source, department
    ) VALUES (
      ${input.patientId}, ${input.visitId}, ${input.category},
      ${input.itemCode ?? null}, ${input.itemName},
      ${input.quantity ?? 1}, ${input.unitPrice},
      ${input.sourceType}, ${input.sourceId ?? null},
      ${input.priceSource ?? 'catalog'}, ${input.department}
    )
    ON CONFLICT DO NOTHING
    RETURNING ${tx.unsafe(FEE_COLS)}
  `;
  if (inserted.length > 0) {
    return { item: mapFee(inserted[0] as Record<string, unknown>), created: true };
  }
  if (input.sourceId) {
    const existing = await tx`
      SELECT ${tx.unsafe(FEE_COLS)} FROM clinical.fee_items
      WHERE source_type = ${input.sourceType} AND source_id = ${input.sourceId}
    `;
    if (existing.length > 0) {
      return { item: mapFee(existing[0] as Record<string, unknown>), created: false };
    }
  }
  // 理论不可达（无 source_id 且未插入）
  throw new Error('费用明细插入失败且无法回查');
}

export async function getFeeItemById(id: string, sql?: DbExecutor): Promise<FeeItem | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(FEE_COLS)} FROM clinical.fee_items WHERE id = ${id}`;
  return rows.length > 0 ? mapFee(rows[0] as Record<string, unknown>) : null;
}

/** 按就诊列费用（可按状态过滤）。 */
export async function listFeeItemsByVisit(
  visitId: string,
  statuses?: FeeItemStatus[],
  sql?: DbExecutor,
): Promise<FeeItem[]> {
  const db = sql ?? getDb();
  const rows = statuses
    ? await db`SELECT ${db.unsafe(FEE_COLS)} FROM clinical.fee_items
               WHERE visit_id = ${visitId} AND status IN ${db(statuses)}
               ORDER BY created_at ASC, id ASC`
    : await db`SELECT ${db.unsafe(FEE_COLS)} FROM clinical.fee_items
               WHERE visit_id = ${visitId} ORDER BY created_at ASC, id ASC`;
  return (rows as Record<string, unknown>[]).map(mapFee);
}

/** 待结算费用：active 且未归集到任何结算单。 */
export async function listOutstandingFeeItems(visitId: string, sql?: DbExecutor): Promise<FeeItem[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(FEE_COLS)} FROM clinical.fee_items
    WHERE visit_id = ${visitId} AND status = 'active' AND settlement_id IS NULL
    ORDER BY created_at ASC, id ASC
  `;
  return (rows as Record<string, unknown>[]).map(mapFee);
}

/**
 * 行锁选定费用并归集到结算单。
 * 仅 active 且未归集（settlement_id IS NULL）的费用可归集；
 * 已被别的结算单占用/状态不符 → 0 行，上层抛 409。
 */
export async function assignFeeItemsToSettlement(
  itemIds: string[],
  settlementId: string,
  tx: DbExecutor,
): Promise<number> {
  if (itemIds.length === 0) return 0;
  // 先锁行，确保并发归集不重复
  const locked = await tx`
    SELECT id FROM clinical.fee_items
    WHERE id IN ${tx(itemIds)} FOR UPDATE
  `;
  if (locked.length !== itemIds.length) {
    throw new Error('存在不可归集的费用明细（已被占用或不存在）');
  }
  const updated = await tx`
    UPDATE clinical.fee_items SET settlement_id = ${settlementId}
    WHERE id IN ${tx(itemIds)} AND status = 'active' AND settlement_id IS NULL
  `;
  return updated.count;
}

/** 收款：把已归集到结算单的费用置为 settled。 */
export async function settleFeeItems(settlementId: string, tx: DbExecutor): Promise<number> {
  const rows = await tx`
    UPDATE clinical.fee_items SET status = 'settled'
    WHERE settlement_id = ${settlementId} AND status = 'active'
  `;
  return rows.count;
}

/** 作废结算单：释放其仍为 active 的费用（清 settlement_id，回到待结算）。 */
export async function releaseFeeItemsBySettlement(
  settlementId: string,
  tx: DbExecutor,
): Promise<number> {
  const rows = await tx`
    UPDATE clinical.fee_items SET settlement_id = NULL
    WHERE settlement_id = ${settlementId} AND status = 'active'
  `;
  return rows.count;
}

/**
 * 退费：条件式把一条 settled 费用置为 refunded（行锁 + 状态白名单）。
 * 已退/非 settled → 0 行，上层抛 409（幂等：同一明细只退一次）。
 */
export async function markFeeItemRefunded(
  feeItemId: string,
  tx: DbExecutor,
): Promise<FeeItem | null> {
  const locked = await tx`
    SELECT ${tx.unsafe(FEE_COLS)} FROM clinical.fee_items
    WHERE id = ${feeItemId} FOR UPDATE
  `;
  if (locked.length === 0) return null;
  const current = mapFee(locked[0] as Record<string, unknown>);
  if (current.status !== 'settled') return null;

  const rows = await tx`
    UPDATE clinical.fee_items SET status = 'refunded'
    WHERE id = ${feeItemId} AND status = 'settled'
    RETURNING ${tx.unsafe(FEE_COLS)}
  `;
  return rows.length > 0 ? mapFee(rows[0] as Record<string, unknown>) : null;
}

/* ============================== 结算单 ============================== */

export interface SettlementCreateInput {
  patientId: string;
  visitId: string;
  department: string;
  paymentMethod?: PaymentMethod;
  totalAmount: number | string;
}

export async function insertSettlement(
  input: SettlementCreateInput,
  tx: DbExecutor,
): Promise<Settlement> {
  const rows = await tx`
    INSERT INTO clinical.settlements (
      settlement_no, patient_id, visit_id, department, payment_method, total_amount
    ) VALUES (
      ${generateSettlementNo()}, ${input.patientId}, ${input.visitId},
      ${input.department}, ${input.paymentMethod ?? 'cash'}, ${input.totalAmount}
    )
    RETURNING ${tx.unsafe(SETTLEMENT_COLS)}
  `;
  return mapSettlement(rows[0] as Record<string, unknown>);
}

export async function getSettlementById(
  id: string,
  sql?: DbExecutor,
): Promise<Settlement | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(SETTLEMENT_COLS)} FROM clinical.settlements WHERE id = ${id}`;
  return rows.length > 0 ? mapSettlement(rows[0] as Record<string, unknown>) : null;
}

/** 结算单队列：默认 unpaid + paid + partially_refunded（在途/近期）。 */
export async function listSettlements(
  statuses: SettlementStatus[],
  sql?: DbExecutor,
): Promise<Settlement[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(SETTLEMENT_COLS)} FROM clinical.settlements
    WHERE status IN ${db(statuses)} ORDER BY updated_at DESC
  `;
  return (rows as Record<string, unknown>[]).map(mapSettlement);
}

/**
 * 收款：条件式状态推进 unpaid → paid（行锁 + 版本乐观锁）。
 * 版本不符/状态非法 → null，上层抛 409。重复收款安全（只成功一次）。
 */
export async function paySettlement(
  id: string,
  expectedVersion: number,
  payerId: string,
  tx: DbExecutor,
): Promise<Settlement | null> {
  const locked = await tx`
    SELECT ${tx.unsafe(SETTLEMENT_COLS)} FROM clinical.settlements
    WHERE id = ${id} FOR UPDATE
  `;
  if (locked.length === 0) return null;
  const current = mapSettlement(locked[0] as Record<string,unknown>);
  if (current.version !== expectedVersion) return null;
  if (current.status !== 'unpaid') return null;

  const rows = await tx`
    UPDATE clinical.settlements
    SET status = 'paid', version = version + 1,
        paid_amount = total_amount, paid_by = ${payerId}, paid_at = now()
    WHERE id = ${id} AND status = 'unpaid' AND version = ${expectedVersion}
    RETURNING ${tx.unsafe(SETTLEMENT_COLS)}
  `;
  return rows.length > 0 ? mapSettlement(rows[0] as Record<string, unknown>) : null;
}

/**
 * 退费联动：累计 refunded_amount，并按退费比例重算结算单状态。
 *  - 全部费用退完 → refunded；仍有未退 → partially_refunded。
 */
export async function applyRefundToSettlement(
  id: string,
  refundAmount: number | string,
  tx: DbExecutor,
): Promise<Settlement> {
  const rows = await tx`
    UPDATE clinical.settlements s
    SET refunded_amount = s.refunded_amount + ${refundAmount},
        version = version + 1,
        status = CASE
          WHEN (s.refunded_amount + ${refundAmount}) >= s.total_amount THEN 'refunded'
          ELSE 'partially_refunded' END
    WHERE id = ${id}
    RETURNING ${tx.unsafe(SETTLEMENT_COLS)}
  `;
  return mapSettlement(rows[0] as Record<string, unknown>);
}

/**
 * 作废：条件式状态推进 unpaid → void（行锁 + 版本乐观锁）。
 */
export async function voidSettlement(
  id: string,
  expectedVersion: number,
  userId: string,
  tx: DbExecutor,
): Promise<Settlement | null> {
  const locked = await tx`
    SELECT ${tx.unsafe(SETTLEMENT_COLS)} FROM clinical.settlements
    WHERE id = ${id} FOR UPDATE
  `;
  if (locked.length === 0) return null;
  const current = mapSettlement(locked[0] as Record<string,unknown>);
  if (current.version !== expectedVersion) return null;
  if (current.status !== 'unpaid') return null;

  const rows = await tx`
    UPDATE clinical.settlements
    SET status = 'void', version = version + 1,
        voided_by = ${userId}, voided_at = now()
    WHERE id = ${id} AND status = 'unpaid' AND version = ${expectedVersion}
    RETURNING ${tx.unsafe(SETTLEMENT_COLS)}
  `;
  return rows.length > 0 ? mapSettlement(rows[0] as Record<string, unknown>) : null;
}

/* ============================== 票据 ============================== */

export interface InvoiceCreateInput {
  settlementId: string;
  patientId: string;
  visitId: string;
  invoiceType?: 'electronic' | 'paper';
  totalAmount: number | string;
  issuedBy: string;
}

export async function insertInvoice(input: InvoiceCreateInput, tx: DbExecutor): Promise<Invoice> {
  const rows = await tx`
    INSERT INTO clinical.invoices (
      invoice_no, settlement_id, patient_id, visit_id, invoice_type,
      total_amount, issued_by
    ) VALUES (
      ${generateInvoiceNo()}, ${input.settlementId}, ${input.patientId},
      ${input.visitId}, ${input.invoiceType ?? 'electronic'},
      ${input.totalAmount}, ${input.issuedBy}
    )
    RETURNING ${tx.unsafe(INVOICE_COLS)}
  `;
  return mapInvoice(rows[0] as Record<string, unknown>);
}

export async function getInvoiceBySettlement(
  settlementId: string,
  sql?: DbExecutor,
): Promise<Invoice | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(INVOICE_COLS)} FROM clinical.invoices
    WHERE settlement_id = ${settlementId} ORDER BY created_at DESC
  `;
  return rows.length > 0 ? mapInvoice(rows[0] as Record<string, unknown>) : null;
}

/** 退费联动：累计票据 refunded_amount。 */
export async function applyRefundToInvoice(
  invoiceId: string,
  refundAmount: number | string,
  tx: DbExecutor,
): Promise<Invoice> {
  const rows = await tx`
    UPDATE clinical.invoices
    SET refunded_amount = refunded_amount + ${refundAmount}
    WHERE id = ${invoiceId}
    RETURNING ${tx.unsafe(INVOICE_COLS)}
  `;
  return mapInvoice(rows[0] as Record<string, unknown>);
}

/* ============================== 退费记录 ============================== */

export interface RefundCreateInput {
  settlementId: string;
  invoiceId?: string | null;
  patientId: string;
  visitId: string;
  feeItemId: string;
  amount: number | string;
  reason: string;
  refundedBy: string;
}

export async function insertRefund(input: RefundCreateInput, tx: DbExecutor): Promise<Refund> {
  const rows = await tx`
    INSERT INTO clinical.refunds (
      refund_no, settlement_id, invoice_id, patient_id, visit_id,
      fee_item_id, amount, reason, refunded_by
    ) VALUES (
      ${generateRefundNo()}, ${input.settlementId}, ${input.invoiceId ?? null},
      ${input.patientId}, ${input.visitId}, ${input.feeItemId},
      ${input.amount}, ${input.reason}, ${input.refundedBy}
    )
    RETURNING ${tx.unsafe(REFUND_COLS)}
  `;
  return mapRefund(rows[0] as Record<string, unknown>);
}

/* ============================== Saga 日志 ============================== */

export interface SagaLogInput {
  sagaId: string;
  visitId?: string | null;
  step: string;
  direction: 'forward' | 'compensate';
  status: 'started' | 'succeeded' | 'failed' | 'compensated';
  detail?: Record<string, unknown>;
}

export async function insertSagaLog(input: SagaLogInput, tx: DbExecutor): Promise<void> {
  await tx`
    INSERT INTO clinical.billing_saga_log (
      saga_id, visit_id, step, direction, status, detail
    ) VALUES (
      ${input.sagaId}, ${input.visitId ?? null}, ${input.step},
      ${input.direction}, ${input.status}, ${tx.json(toJson(input.detail ?? {}))}
    )
  `;
}

export async function listSagaLog(sagaId: string, sql?: DbExecutor) {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT id, saga_id, visit_id, step, direction, status, detail, created_at
    FROM clinical.billing_saga_log WHERE saga_id = ${sagaId}
    ORDER BY created_at ASC, id ASC
  `;
  return rows as Record<string, unknown>[];
}
