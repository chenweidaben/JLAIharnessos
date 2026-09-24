/**
 * 健澜科技数智医院智能体 - 医嘱 Repository
 * clinical.orders 表 CRUD，支持状态流转（active → executed / cancelled / audited）。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type Sql, withTx } from '../pool.js';
import { dynamicSelect, QueryBuilder, toJson } from './helpers.js';

export type OrderType = 'drug' | 'lab' | 'imaging' | 'treatment' | 'nursing' | 'diet' | 'other';
export type OrderStatus = 'active' | 'executed' | 'cancelled' | 'audited';
export type OrderPriority = 'routine' | 'urgent' | 'stat';

export interface Order {
  id: string; visitId: string; orderNo: string; orderType: OrderType;
  content: string; detail: Record<string, unknown>; priority: OrderPriority;
  status: OrderStatus; doctorId: string | null; startAt: string | null;
  stopAt: string | null; createdAt: string; updatedAt: string;
}

export interface OrderCreateInput {
  visitId: string; orderType: OrderType; content: string;
  detail?: Record<string, unknown>; priority?: OrderPriority;
  doctorId?: string | null; startAt?: string | null;
}

const SELECT_COLS = `id, visit_id, order_no, order_type, content, detail, priority, status, doctor_id, start_at, stop_at, created_at, updated_at`;

function mapRow(row: Record<string, unknown>): Order {
  return {
    id: String(row.id), visitId: String(row.visit_id), orderNo: String(row.order_no),
    orderType: row.order_type as OrderType, content: String(row.content),
    detail: (row.detail as Record<string, unknown>) ?? {},
    priority: row.priority as OrderPriority, status: row.status as OrderStatus,
    doctorId: row.doctor_id ? String(row.doctor_id) : null,
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

export async function createOrder(input: OrderCreateInput, sql?: Sql): Promise<Order> {
  const db = sql ?? getDb();
  const rows = await db`
    INSERT INTO clinical.orders (visit_id, order_no, order_type, content, detail, priority, doctor_id, start_at)
    VALUES (${input.visitId}, ${generateOrderNo()}, ${input.orderType}, ${input.content},
      ${db.json(toJson(input.detail ?? {}))}, ${input.priority ?? 'routine'},
      ${input.doctorId ?? null}, ${input.startAt ?? new Date().toISOString()})
    RETURNING ${db(SELECT_COLS)}
  `;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function getOrderById(id: string, sql?: Sql): Promise<Order | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db(SELECT_COLS)} FROM clinical.orders WHERE id = ${id}`;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

export async function getOrdersByVisit(
  visitId: string, options?: { status?: OrderStatus; limit?: number }, sql?: Sql,
): Promise<Order[]> {
  const db = sql ?? getDb();
  const qb = new QueryBuilder().where('visit_id = ?', visitId);
  if (options?.status) qb.where('status = ?', options.status);
  const rows = await dynamicSelect<Record<string, unknown>>(db, SELECT_COLS, 'clinical.orders', qb, 'created_at DESC', options?.limit ?? 100);
  return rows.map(mapRow);
}

export async function getOrdersByPatient(
  patientId: string, options?: { status?: OrderStatus; limit?: number }, sql?: Sql,
): Promise<Order[]> {
  const db = sql ?? getDb();
  const qb = new QueryBuilder().where('v.patient_id = ?', patientId);
  if (options?.status) qb.where('o.status = ?', options.status);
  const extra: unknown[] = [];
  let suffix = '';
  if (options?.limit !== undefined) { extra.push(options.limit); suffix += ` LIMIT $${qb.getParams(extra).length}`; }
  const rows = await db.unsafe(
    `SELECT o.${SELECT_COLS} FROM clinical.orders o JOIN clinical.visits v ON v.id = o.visit_id ${qb.toClause()} ORDER BY o.created_at DESC${suffix}`,
    qb.getParams(extra),
  );
  return (rows as Record<string, unknown>[]).map(mapRow);
}

export async function updateOrderStatus(id: string, status: OrderStatus, sql?: Sql): Promise<Order | null> {
  const db = sql ?? getDb();
  const stopAt = status === 'cancelled' || status === 'executed' ? new Date().toISOString() : null;
  const rows = await db`
    UPDATE clinical.orders SET status = ${status}, stop_at = COALESCE(stop_at, ${stopAt ?? null}), updated_at = now()
    WHERE id = ${id} RETURNING ${db(SELECT_COLS)}
  `;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

export async function cancelOrder(id: string, reason: string, sql?: Sql): Promise<Order | null> {
  return withTx(async (tx) => {
    const current = await getOrderById(id, tx as unknown as Sql);
    if (!current) return null;
    const detail = { ...current.detail, cancelReason: reason, cancelledAt: new Date().toISOString() };
    const rows = await tx`
      UPDATE clinical.orders SET status = 'cancelled', detail = ${tx.json(toJson(detail))}, stop_at = now(), updated_at = now()
      WHERE id = ${id} RETURNING ${tx(SELECT_COLS)}
    `;
    return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
  });
}
