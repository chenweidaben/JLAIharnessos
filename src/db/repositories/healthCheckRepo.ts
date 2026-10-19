/**
 * 健澜科技 jlmedaios - 体检中心 repo（M40-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb, type DbExecutor } from '../pool.js';

export interface Package { id: string; name: string; items: string[]; priceCents: number; active: boolean; }
export interface Order { id: string; packageId: string; patientId: string; appointmentDate: string; status: string; createdAt: string; }
export interface OrderItem { id: string; orderId: string; itemName: string; completed: boolean; completedAt: string | null; }

const PCOLS = `id, name, items, price_cents, active`;
const OCOLS = `id, package_id, patient_id, appointment_date, status, created_at`;
const ICOLS = `id, order_id, item_name, completed, completed_at`;

function pmap(r: Record<string, unknown>): Package {
  return { id: String(r.id), name: String(r.name), items: (r.items as string[]) ?? [], priceCents: Number(r.price_cents), active: Boolean(r.active) };
}
function omap(r: Record<string, unknown>): Order {
  return { id: String(r.id), packageId: String(r.package_id), patientId: String(r.patient_id), appointmentDate: String(r.appointment_date), status: String(r.status), createdAt: String(r.created_at) };
}
function imap(r: Record<string, unknown>): OrderItem {
  return { id: String(r.id), orderId: String(r.order_id), itemName: String(r.item_name), completed: Boolean(r.completed), completedAt: r.completed_at ? String(r.completed_at) : null };
}

export async function listPackages(): Promise<Package[]> {
  if (process.env.DEMO_MODE === '1') {
    return [
      {
        id: 'demo-pkg-0001-0000-0000-0000-000000000001',
        name: '演示-基础体检套餐',
        items: ['一般检查', '血常规', '胸片'],
        priceCents: 39900,
        active: true,
      },
      {
        id: 'demo-pkg-0002-0000-0000-0000-000000000002',
        name: '演示-深度体检套餐',
        items: ['一般检查', '血常规', '生化全项', '腹部超声', '心电图'],
        priceCents: 129900,
        active: true,
      },
    ];
  }
  const db = getDb();
  const rows = await db`SELECT ${db.unsafe(PCOLS)} FROM clinical.health_check_packages WHERE active=true ORDER BY name`;
  return rows.map(pmap);
}

export async function getPackage(id: string): Promise<Package | null> {
  const db = getDb();
  const rows = await db`SELECT ${db.unsafe(PCOLS)} FROM clinical.health_check_packages WHERE id=${id}`;
  return rows[0] ? pmap(rows[0]) : null;
}

export async function createOrder(inp: { packageId: string; patientId: string; appointmentDate: string }, tx: DbExecutor = getDb()): Promise<Order> {
  const rows = await tx`
    INSERT INTO clinical.health_check_orders (package_id, patient_id, appointment_date)
    VALUES (${inp.packageId}, ${inp.patientId}, ${inp.appointmentDate})
    RETURNING ${tx.unsafe(OCOLS)}`;
  return omap(rows[0]);
}

export async function createOrderItem(orderId: string, itemName: string, tx: DbExecutor): Promise<void> {
  await tx`
    INSERT INTO clinical.health_check_order_items (order_id, item_name)
    VALUES (${orderId}, ${itemName}) ON CONFLICT (order_id, item_name) DO NOTHING`;
}

export async function listOrderItems(orderId: string, tx: DbExecutor = getDb()): Promise<OrderItem[]> {
  const rows = await tx`SELECT ${tx.unsafe(ICOLS)} FROM clinical.health_check_order_items WHERE order_id=${orderId} ORDER BY item_name`;
  return rows.map(imap);
}

export async function markItemComplete(orderId: string, itemName: string, tx: DbExecutor): Promise<OrderItem | null> {
  const rows = await tx`
    UPDATE clinical.health_check_order_items SET completed=true, completed_at=now()
    WHERE order_id=${orderId} AND item_name=${itemName}
    RETURNING ${tx.unsafe(ICOLS)}`;
  return rows[0] ? imap(rows[0]) : null;
}

export async function getOrder(orderId: string, tx: DbExecutor = getDb()): Promise<Order | null> {
  const rows = await tx`SELECT ${tx.unsafe(OCOLS)} FROM clinical.health_check_orders WHERE id=${orderId}`;
  return rows[0] ? omap(rows[0]) : null;
}

export async function setOrderStatus(orderId: string, status: string, tx: DbExecutor): Promise<void> {
  await tx`UPDATE clinical.health_check_orders SET status=${status} WHERE id=${orderId}`;
}
