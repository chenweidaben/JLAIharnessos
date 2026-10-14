/**
 * 健澜科技 jlmedaios - 医嘱仓储
 *
 * 真实落 PostgreSQL（postgres.js）。边界使用 DbExecutor 以同时兼容
 * 连接池（Sql）与事务句柄（TransactionSql），供聚合器在同一事务内复用。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb, type DbExecutor } from '../pool.js';

export type OrderType =
  | 'drug' | 'lab' | 'imaging' | 'nursing' | 'surgery'
  | 'consult' | 'monitor' | 'nutrition' | 'other' | 'treatment';
export type OrderPriority = 'routine' | 'urgent' | 'stat';
export type OrderCategory = 'medical' | 'nursing' | 'ancillary' | 'long_term' | 'short_term';
export type OrderStatus =
  | 'pending_review' | 'active' | 'completed' | 'cancelled'
  | 'stopped' | 'executed' | 'rejected' | 'audited';

export interface Order {
  id: string; visitId: string; orderType: string; content: string;
  dosage: string | null; frequency: string | null; route: string | null;
  startDate: string; endDate: string | null;
  status: OrderStatus;
  orderedBy: string; reviewedBy: string | null; reviewedAt: string | null;
  cancelledBy: string | null; cancelledAt: string | null; cancelReason: string | null;
  /** 结构化扩展字段（住院/门诊聚合器与数据门面共用）；真实库部分列暂未落库，类型上可空。 */
  orderNo?: string | null;
  category?: OrderCategory | null;
  detail: Record<string, unknown>;
  createdAt?: string | null;
  updatedAt?: string | null;
  priority?: OrderPriority | null;
  startAt?: string | null;
  stopAt?: string | null;
  doctorId?: string | null;
  requiresDoubleCheck?: boolean;
  reviewerId?: string | null;
  rejectReason?: string | null;
}

export interface OrderExecution {
  id: string; orderId: string; executedBy: string; executedAt: string; result: string | null; note: string | null;
}

export async function create(input: {
  visitId: string; orderType: string; content: string;
  dosage?: string; frequency?: string; route?: string;
  orderedBy?: string; doctorId?: string | null;
  detail?: Record<string, unknown>; priority?: OrderPriority;
}): Promise<Order> {
  const db = getDb();
  const rows = await db`
    INSERT INTO clinical.orders (visit_id, order_type, content, dosage, frequency, route, ordered_by)
    VALUES (${input.visitId}, ${input.orderType}, ${input.content}, ${input.dosage ?? null},
      ${input.frequency ?? null}, ${input.route ?? null}, ${input.orderedBy ?? input.doctorId ?? null})
    RETURNING *
  `;
  return mapOrder(rows[0]);
}

export async function createInpatientOrder(input: {
  visitId: string; orderType: string; content: string;
  dosage?: string; frequency?: string; route?: string;
  orderedBy?: string; doctorId?: string | null;
  detail?: Record<string, unknown>; priority?: OrderPriority; category?: OrderCategory;
  requiresDoubleCheck?: boolean;
}, tx?: DbExecutor): Promise<Order> {
  const db = tx ?? getDb();
  const rows = await db`
    INSERT INTO clinical.orders (visit_id, order_type, content, dosage, frequency, route, ordered_by)
    VALUES (${input.visitId}, ${input.orderType}, ${input.content}, ${input.dosage ?? null},
      ${input.frequency ?? null}, ${input.route ?? null}, ${input.orderedBy ?? input.doctorId ?? null})
    RETURNING *
  `;
  return mapOrder(rows[0]);
}

export async function listByVisit(
  visitId: string,
  opts?: { limit?: number },
  tx?: DbExecutor,
): Promise<Order[]> {
  const db = tx ?? getDb();
  const rows = opts?.limit
    ? await db`SELECT * FROM clinical.orders WHERE visit_id=${visitId} ORDER BY created_at DESC LIMIT ${opts.limit}`
    : await db`SELECT * FROM clinical.orders WHERE visit_id=${visitId} ORDER BY created_at DESC`;
  return rows.map(mapOrder);
}

export async function getOrdersByPatient(
  patientId: string,
  opts?: { limit?: number; status?: OrderStatus },
  tx?: DbExecutor,
): Promise<Order[]> {
  const db = tx ?? getDb();
  const rows = opts?.status
    ? await db`
      SELECT o.* FROM clinical.orders o
      JOIN clinical.visits v ON v.id = o.visit_id
      WHERE v.patient_id = ${patientId} AND o.status = ${opts.status}
      ORDER BY o.created_at DESC
    `
    : await db`
      SELECT o.* FROM clinical.orders o
      JOIN clinical.visits v ON v.id = o.visit_id
      WHERE v.patient_id = ${patientId}
      ORDER BY o.created_at DESC
    `;
  return rows.map(mapOrder);
}

export async function getOrderById(id: string, tx?: DbExecutor): Promise<Order | null> {
  const db = tx ?? getDb();
  const rows = await db`SELECT * FROM clinical.orders WHERE id=${id}`;
  return rows.length ? mapOrder(rows[0]) : null;
}

export async function cancel(id: string, doctorId: string, reason: string): Promise<Order | null> {
  const db = getDb();
  const rows = await db`
    UPDATE clinical.orders SET status='cancelled', cancelled_by=${doctorId}, cancelled_at=now(),
      cancel_reason=${reason}, updated_at=now()
    WHERE id=${id} AND status IN ('active','pending_review') RETURNING *
  `;
  return rows.length ? mapOrder(rows[0]) : null;
}

export async function reviewOrder(id: string, doctorId: string, tx?: DbExecutor): Promise<Order | null> {
  const db = tx ?? getDb();
  const rows = await db`
    UPDATE clinical.orders SET status='active', reviewed_by=${doctorId}, reviewed_at=now(), updated_at=now()
    WHERE id=${id} AND status='pending_review' RETURNING *
  `;
  return rows.length ? mapOrder(rows[0]) : null;
}

export async function rejectOrder(id: string, doctorId: string, reason: string, tx?: DbExecutor): Promise<Order | null> {
  const db = tx ?? getDb();
  const rows = await db`
    UPDATE clinical.orders SET status='cancelled', cancelled_by=${doctorId}, cancelled_at=now(),
      cancel_reason=${reason}, updated_at=now()
    WHERE id=${id} AND status='pending_review' RETURNING *
  `;
  return rows.length ? mapOrder(rows[0]) : null;
}

export async function stopOrder(id: string, tx?: DbExecutor): Promise<Order | null> {
  const db = tx ?? getDb();
  const rows = await db`
    UPDATE clinical.orders SET status='stopped', updated_at=now()
    WHERE id=${id} AND status='active' RETURNING *
  `;
  return rows.length ? mapOrder(rows[0]) : null;
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order | null> {
  const db = getDb();
  const rows = await db`
    UPDATE clinical.orders SET status=${status}, updated_at=now()
    WHERE id=${id} RETURNING *
  `;
  return rows.length ? mapOrder(rows[0]) : null;
}

export async function execute(id: string, nurseId: string, result?: string, note?: string): Promise<OrderExecution> {
  const db = getDb();
  const rows = await db`
    INSERT INTO clinical.order_executions (order_id, executed_by, result, note)
    VALUES (${id}, ${nurseId}, ${result ?? null}, ${note ?? null})
    RETURNING *
  `;
  return mapExec(rows[0]);
}

/** 临时医嘱单次执行后置位（返回最新 Order 行）。 */
export async function markOrderExecuted(orderId: string, tx?: DbExecutor): Promise<Order | null> {
  const db = tx ?? getDb();
  const rows = await db`SELECT * FROM clinical.orders WHERE id=${orderId}`;
  return rows.length ? mapOrder(rows[0]) : null;
}

export async function listExecutions(orderId: string): Promise<OrderExecution[]> {
  const db = getDb();
  const rows = await db`SELECT * FROM clinical.order_executions WHERE order_id=${orderId} ORDER BY executed_at DESC`;
  return rows.map(mapExec);
}

export async function listByDoctor(doctorId: string): Promise<Order[]> {
  const db = getDb();
  const rows = await db`SELECT * FROM clinical.orders WHERE ordered_by=${doctorId} ORDER BY created_at DESC LIMIT 200`;
  return rows.map(mapOrder);
}

function mapOrder(r: Record<string, unknown>): Order {
  return {
    id: r.id as string, visitId: r.visit_id as string, orderType: r.order_type as string,
    content: r.content as string, dosage: r.dosage as string | null,
    frequency: r.frequency as string | null, route: r.route as string | null,
    startDate: r.start_date as string, endDate: r.end_date as string | null,
    status: (r.status as OrderStatus) ?? 'active', orderedBy: r.ordered_by as string,
    reviewedBy: (r.reviewed_by as string | null) ?? null,
    reviewedAt: (r.reviewed_at as string | null) ?? null,
    cancelledBy: r.cancelled_by as string | null, cancelledAt: r.cancelled_at as string | null,
    cancelReason: r.cancel_reason as string | null,
    orderNo: (r.order_no as string | null) ?? null,
    category: (r.category as OrderCategory | null) ?? null,
    detail: (r.detail as Record<string, unknown>) ?? {},
    createdAt: (r.created_at as string | null) ?? null,
    updatedAt: (r.updated_at as string | null) ?? null,
    priority: (r.priority as OrderPriority | null) ?? null,
    startAt: (r.start_at as string | null) ?? null,
    stopAt: (r.stop_at as string | null) ?? null,
    doctorId: (r.doctor_id as string | null) ?? null,
    requiresDoubleCheck: Boolean(r.requires_double_check),
    reviewerId: (r.reviewer_id as string | null) ?? null,
    rejectReason: (r.reject_reason as string | null) ?? null,
  };
}

function mapExec(r: Record<string, unknown>): OrderExecution {
  return {
    id: r.id as string, orderId: r.order_id as string, executedBy: r.executed_by as string,
    executedAt: r.executed_at as string, result: r.result as string | null, note: r.note as string | null,
  };
}

export const createOrder = create;
/** 兼容数据门面/门诊聚合器的两参取消语义：cancelOrder(id, reason)。 */
export async function cancelOrder(id: string, reason: string): Promise<Order | null> {
  return cancel(id, 'system', reason);
}
export const getOrdersByVisit = listByVisit;
