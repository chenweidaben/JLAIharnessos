/**
 * 健澜科技数智医院智能体 - 医嘱 Repository
 * clinical.orders 表 CRUD，支持门诊与住院两套状态流转。
 *
 *  - 门诊（M0，保持不回归）：createOrder 默认 active → executed / cancelled / audited；
 *  - 住院（M1-B2）：createInpatientOrder 落 pending_review（待审核），
 *      经 review(医师审核) → active，护士执行（order_administrations），
 *      stop(医师停止) / reject(审核驳回) / cancel(取消)。
 *
 * 职责分离的角色判定由聚合器负责（护士不可审核/停止医嘱）。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor, withTx } from '../pool.js';
import { dynamicSelect, QueryBuilder, toJson } from './helpers.js';

export type OrderType = 'drug' | 'lab' | 'imaging' | 'treatment' | 'nursing' | 'diet' | 'other';
export type OrderStatus =
  | 'pending_review'
  | 'active'
  | 'executed'
  | 'stopped'
  | 'cancelled'
  | 'rejected'
  | 'audited';
export type OrderPriority = 'routine' | 'urgent' | 'stat';
export type OrderCategory = 'long_term' | 'short_term';

export interface Order {
  id: string; visitId: string; orderNo: string; orderType: OrderType;
  content: string; detail: Record<string, unknown>; priority: OrderPriority;
  status: OrderStatus; category: OrderCategory; doctorId: string | null;
  reviewerId: string | null; reviewedAt: string | null; rejectReason: string | null;
  requiresDoubleCheck: boolean;
  startAt: string | null; stopAt: string | null;
  createdAt: string; updatedAt: string;
}

export interface OrderCreateInput {
  visitId: string; orderType: OrderType; content: string;
  detail?: Record<string, unknown>; priority?: OrderPriority;
  doctorId?: string | null; startAt?: string | null;
}

export interface InpatientOrderInput {
  visitId: string;
  orderType: OrderType;
  content: string;
  detail?: Record<string, unknown>;
  priority?: OrderPriority;
  category?: OrderCategory;                 // 长期 / 临时
  doctorId?: string | null;
  requiresDoubleCheck?: boolean;           // 高风险药/血制品需双人核对
}

const SELECT_COLS = `id, visit_id, order_no, order_type, content, detail, priority, status,
  category, doctor_id, reviewer_id, reviewed_at, reject_reason, requires_double_check,
  start_at, stop_at, created_at, updated_at`;

function mapRow(row: Record<string, unknown>): Order {
  return {
    id: String(row.id), visitId: String(row.visit_id), orderNo: String(row.order_no),
    orderType: row.order_type as OrderType, content: String(row.content),
    detail: (row.detail as Record<string, unknown>) ?? {},
    priority: row.priority as OrderPriority, status: row.status as OrderStatus,
    category: (row.category as OrderCategory) ?? 'short_term',
    doctorId: row.doctor_id ? String(row.doctor_id) : null,
    reviewerId: row.reviewer_id ? String(row.reviewer_id) : null,
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    rejectReason: row.reject_reason ? String(row.reject_reason) : null,
    requiresDoubleCheck: Boolean(row.requires_double_check),
    startAt: row.start_at ? String(row.start_at) : null,
    stopAt: row.stop_at ? String(row.stop_at) : null,
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

function generateOrderNo(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `ORD${ymd}${Math.floor(Math.random() * 900000) + 100000}`;
}

/**
 * 门诊医嘱（默认 active，保持 M0 行为）。
 * 显式以 category='short_term' 落库；门诊不经过住院审核流。
 */
export async function createOrder(input: OrderCreateInput, sql?: DbExecutor): Promise<Order> {
  const db = sql ?? getDb();
  const rows = await db`
    INSERT INTO clinical.orders (visit_id, order_no, order_type, content, detail, priority,
      status, category, doctor_id, start_at)
    VALUES (${input.visitId}, ${generateOrderNo()}, ${input.orderType}, ${input.content},
      ${db.json(toJson(input.detail ?? {}))}, ${input.priority ?? 'routine'},
      'active', 'short_term',
      ${input.doctorId ?? null}, ${input.startAt ?? new Date().toISOString()})
    RETURNING ${db.unsafe(SELECT_COLS)}
  `;
  return mapRow(rows[0] as Record<string, unknown>);
}

/**
 * 住院医嘱：落 pending_review（待审核），需经医师 review 后方可执行。
 * 长期医嘱默认 start_at=now；临时医嘱同。
 */
export async function createInpatientOrder(input: InpatientOrderInput, sql?: DbExecutor): Promise<Order> {
  const db = sql ?? getDb();
  const category: OrderCategory = input.category ?? 'short_term';
  const rows = await db`
    INSERT INTO clinical.orders (visit_id, order_no, order_type, content, detail, priority,
      status, category, doctor_id, requires_double_check, start_at)
    VALUES (${input.visitId}, ${generateOrderNo()}, ${input.orderType}, ${input.content},
      ${db.json(toJson(input.detail ?? {}))}, ${input.priority ?? 'routine'},
      'pending_review', ${category},
      ${input.doctorId ?? null}, ${input.requiresDoubleCheck ?? false},
      ${new Date().toISOString()})
    RETURNING ${db.unsafe(SELECT_COLS)}
  `;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function getOrderById(id: string, sql?: DbExecutor): Promise<Order | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(SELECT_COLS)} FROM clinical.orders WHERE id = ${id}`;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

export async function getOrdersByVisit(
  visitId: string, options?: { status?: OrderStatus; category?: OrderCategory; limit?: number },
  sql?: DbExecutor,
): Promise<Order[]> {
  const db = sql ?? getDb();
  const qb = new QueryBuilder().where('visit_id = ?', visitId);
  if (options?.status) qb.where('status = ?', options.status);
  if (options?.category) qb.where('category = ?', options.category);
  const rows = await dynamicSelect<Record<string, unknown>>(
    db, SELECT_COLS, 'clinical.orders', qb, 'category DESC, created_at DESC', options?.limit ?? 200,
  );
  return rows.map(mapRow);
}

export async function getOrdersByPatient(
  patientId: string, options?: { status?: OrderStatus; limit?: number }, sql?: DbExecutor,
): Promise<Order[]> {
  const db = sql ?? getDb();
  const qb = new QueryBuilder().where('v.patient_id = ?', patientId);
  if (options?.status) qb.where('o.status = ?', options.status);
  const extra: unknown[] = [];
  let suffix = '';
  if (options?.limit !== undefined) { extra.push(options.limit); suffix += ` LIMIT $${qb.getParams(extra).length}`; }
  // JOIN 后 orders/visits 均有 status/created_at 等同名列，必须逐列加 o. 前缀避免歧义
  const colsAliased = SELECT_COLS.split(',').map((c) => 'o.' + c.trim()).join(', ');
  const rows = await db.unsafe(
    `SELECT ${colsAliased} FROM clinical.orders o JOIN clinical.visits v ON v.id = o.visit_id ${qb.toClause()} ORDER BY o.created_at DESC${suffix}`,
    qb.getParams(extra),
  );
  return (rows as Record<string, unknown>[]).map(mapRow);
}

export async function updateOrderStatus(id: string, status: OrderStatus, sql?: DbExecutor): Promise<Order | null> {
  const db = sql ?? getDb();
  const terminal = status === 'cancelled' || status === 'executed' || status === 'stopped';
  const rows = await db`
    UPDATE clinical.orders
    SET status = ${status},
        stop_at = CASE WHEN ${terminal} THEN COALESCE(stop_at, now()) ELSE stop_at END,
        updated_at = now()
    WHERE id = ${id} RETURNING ${db.unsafe(SELECT_COLS)}
  `;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

/**
 * 医嘱审核（医师）：pending_review → active。
 * 以 CAS 保证只有待审核医嘱可被审核，重复审核返回 null（幂等不报错由聚合器决定）。
 */
export async function reviewOrder(id: string, reviewerId: string, sql?: DbExecutor): Promise<Order | null> {
  const db = sql ?? getDb();
  const rows = await db`
    UPDATE clinical.orders
    SET status = 'active', reviewer_id = ${reviewerId}, reviewed_at = now(), updated_at = now()
    WHERE id = ${id} AND status = 'pending_review'
    RETURNING ${db.unsafe(SELECT_COLS)}
  `;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

/** 审核驳回（医师）：pending_review → rejected，记录驳回原因。 */
export async function rejectOrder(
  id: string, reviewerId: string, reason: string, sql?: DbExecutor,
): Promise<Order | null> {
  const db = sql ?? getDb();
  const rows = await db`
    UPDATE clinical.orders
    SET status = 'rejected', reviewer_id = ${reviewerId}, reviewed_at = now(),
        reject_reason = ${reason}, stop_at = now(), updated_at = now()
    WHERE id = ${id} AND status = 'pending_review'
    RETURNING ${db.unsafe(SELECT_COLS)}
  `;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

/** 停止医嘱（医师）：active → stopped（长期医嘱停止）。 */
export async function stopOrder(id: string, sql?: DbExecutor): Promise<Order | null> {
  const db = sql ?? getDb();
  const rows = await db`
    UPDATE clinical.orders
    SET status = 'stopped', stop_at = now(), updated_at = now()
    WHERE id = ${id} AND status = 'active'
    RETURNING ${db.unsafe(SELECT_COLS)}
  `;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

/** 标记医嘱已执行完成（临时医嘱单次执行后；长期医嘱末次后）。 */
export async function markOrderExecuted(id: string, sql?: DbExecutor): Promise<Order | null> {
  const db = sql ?? getDb();
  const rows = await db`
    UPDATE clinical.orders
    SET status = 'executed', stop_at = COALESCE(stop_at, now()), updated_at = now()
    WHERE id = ${id} AND status = 'active'
    RETURNING ${db.unsafe(SELECT_COLS)}
  `;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

export async function cancelOrder(id: string, reason: string, sql?: DbExecutor): Promise<Order | null> {
  return withTx(async (tx) => {
    const current = await getOrderById(id, tx as unknown as DbExecutor);
    if (!current) return null;
    const detail = { ...current.detail, cancelReason: reason, cancelledAt: new Date().toISOString() };
    const rows = await tx`
      UPDATE clinical.orders SET status = 'cancelled', detail = ${tx.json(toJson(detail))},
        stop_at = now(), updated_at = now()
      WHERE id = ${id} RETURNING ${tx.unsafe(SELECT_COLS)}
    `;
    return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
  });
}
