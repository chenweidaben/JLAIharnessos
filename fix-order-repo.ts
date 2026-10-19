import { writeFileSync } from 'fs';

const content = `import { getDb } from '../pool.js';

export type OrderType = 'drug' | 'lab' | 'imaging' | 'nursing' | 'surgery' | 'consult' | 'monitor' | 'nutrition' | 'other';
export type OrderPriority = 'routine' | 'urgent' | 'stat';
export type OrderCategory = 'medical' | 'nursing' | 'ancillary';

export interface Order {
  id: string; visitId: string; orderType: string; content: string;
  dosage: string | null; frequency: string | null; route: string | null;
  startDate: string; endDate: string | null;
  status: 'pending_review' | 'active' | 'completed' | 'cancelled' | 'stopped';
  orderedBy: string; reviewedBy: string | null; reviewedAt: string | null;
  cancelledBy: string | null; cancelledAt: string | null; cancelReason: string | null;
}

export interface OrderExecution {
  id: string; orderId: string; executedBy: string; executedAt: string; result: string | null; note: string | null;
}

export async function create(input: {
  visitId: string; orderType: string; content: string;
  dosage?: string; frequency?: string; route?: string; orderedBy: string;
}): Promise<Order> {
  const db = getDb();
  const rows = await db\`
    INSERT INTO clinical.orders (visit_id, order_type, content, dosage, frequency, route, ordered_by)
    VALUES (\${input.visitId}, \${input.orderType}, \${input.content}, \${input.dosage ?? null},
      \${input.frequency ?? null}, \${input.route ?? null}, \${input.orderedBy})
    RETURNING *
  \`;
  return mapOrder(rows[0]);
}

export async function createInpatientOrder(input: {
  visitId: string; orderType: string; content: string;
  dosage?: string; frequency?: string; route?: string; orderedBy: string;
  priority?: string;
}): Promise<Order> {
  return create(input);
}

export async function listByVisit(visitId: string): Promise<Order[]> {
  const db = getDb();
  const rows = await db\`SELECT * FROM clinical.orders WHERE visit_id=\${visitId} ORDER BY created_at DESC\`;
  return rows.map(mapOrder);
}

export async function getOrderById(id: string, tx?: ReturnType<typeof getDb>): Promise<Order | null> {
  const db = tx ?? getDb();
  const rows = await db\`SELECT * FROM clinical.orders WHERE id=\${id}\`;
  return rows.length ? mapOrder(rows[0]) : null;
}

export async function cancel(id: string, doctorId: string, reason: string): Promise<Order | null> {
  const db = getDb();
  const rows = await db\`
    UPDATE clinical.orders SET status='cancelled', cancelled_by=\${doctorId}, cancelled_at=now(),
      cancel_reason=\${reason}, updated_at=now()
    WHERE id=\${id} AND status IN ('active','pending_review') RETURNING *
  \`;
  return rows.length ? mapOrder(rows[0]) : null;
}

export async function reviewOrder(id: string, doctorId: string): Promise<Order | null> {
  const db = getDb();
  const rows = await db\`
    UPDATE clinical.orders SET status='active', reviewed_by=\${doctorId}, reviewed_at=now(), updated_at=now()
    WHERE id=\${id} AND status='pending_review' RETURNING *
  \`;
  return rows.length ? mapOrder(rows[0]) : null;
}

export async function rejectOrder(id: string, doctorId: string, reason: string): Promise<Order | null> {
  const db = getDb();
  const rows = await db\`
    UPDATE clinical.orders SET status='cancelled', cancelled_by=\${doctorId}, cancelled_at=now(),
      cancel_reason=\${reason}, updated_at=now()
    WHERE id=\${id} AND status='pending_review' RETURNING *
  \`;
  return rows.length ? mapOrder(rows[0]) : null;
}

export async function stopOrder(id: string, doctorId: string, reason: string): Promise<Order | null> {
  const db = getDb();
  const rows = await db\`
    UPDATE clinical.orders SET status='stopped', cancelled_by=\${doctorId}, cancelled_at=now(),
      cancel_reason=\${reason}, updated_at=now()
    WHERE id=\${id} AND status='active' RETURNING *
  \`;
  return rows.length ? mapOrder(rows[0]) : null;
}

export async function execute(id: string, nurseId: string, result?: string, note?: string): Promise<OrderExecution> {
  const db = getDb();
  const rows = await db\`
    INSERT INTO clinical.order_executions (order_id, executed_by, result, note)
    VALUES (\${id}, \${nurseId}, \${result ?? null}, \${note ?? null})
    RETURNING *
  \`;
  return mapExec(rows[0]);
}

export async function markOrderExecuted(id: string, nurseId: string, note?: string): Promise<OrderExecution> {
  return execute(id, nurseId, undefined, note);
}

export async function listExecutions(orderId: string): Promise<OrderExecution[]> {
  const db = getDb();
  const rows = await db\`SELECT * FROM clinical.order_executions WHERE order_id=\${orderId} ORDER BY executed_at DESC\`;
  return rows.map(mapExec);
}

export async function listByDoctor(doctorId: string): Promise<Order[]> {
  const db = getDb();
  const rows = await db\`SELECT * FROM clinical.orders WHERE ordered_by=\${doctorId} ORDER BY created_at DESC LIMIT 200\`;
  return rows.map(mapOrder);
}

function mapOrder(r: Record<string, unknown>): Order {
  return {
    id: r.id as string, visitId: r.visit_id as string, orderType: r.order_type as string,
    content: r.content as string, dosage: r.dosage as string | null,
    frequency: r.frequency as string | null, route: r.route as string | null,
    startDate: r.start_date as string, endDate: r.end_date as string | null,
    status: (r.status as Order['status']) ?? 'active', orderedBy: r.ordered_by as string,
    reviewedBy: (r.reviewed_by as string | null) ?? null,
    reviewedAt: (r.reviewed_at as string | null) ?? null,
    cancelledBy: r.cancelled_by as string | null, cancelledAt: r.cancelled_at as string | null,
    cancelReason: r.cancel_reason as string | null,
  };
}

function mapExec(r: Record<string, unknown>): OrderExecution {
  return {
    id: r.id as string, orderId: r.order_id as string, executedBy: r.executed_by as string,
    executedAt: r.executed_at as string, result: r.result as string | null, note: r.note as string | null,
  };
}

export const createOrder = create;
export const cancelOrder = cancel;
export const getOrdersByVisit = listByVisit;
`;

writeFileSync('src/db/repositories/orderRepo.ts', content, 'utf8');
console.log('orderRepo.ts written');
