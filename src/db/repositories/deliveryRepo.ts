/**
 * 健澜科技 jlmedaios - 互联网处方配送 Repository（M3-N）
 *
 * prescription_deliveries 读写（自取/快递双通道履约）。
 *
 * 并发与一致性：
 *  - 一单处方同时仅一个有效配送单（部分唯一索引 uq_open_delivery_per_rx），
 *    建单冲突时回查返回既有单（上层幂等）；
 *  - 状态机 CAS：created→packed→shipped→delivered（快递）
 *                created→packed→picked_up（自取）
 *                created|packed→cancelled；
 *  - 有效取货码唯一（防串单核销）；
 *  - 快递单固化地址快照与物流单号。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, withTx, type DbExecutor } from '../pool.js';

/* -------------------------------- 类型 -------------------------------- */

export type DeliveryChannel = 'self_pick' | 'express';
export type DeliveryStatus =
  | 'created' | 'packed' | 'shipped' | 'delivered' | 'picked_up' | 'cancelled';

export interface PrescriptionDelivery {
  id: string;
  deliveryNo: string;
  rxId: string;
  patientId: string;
  accountId: string | null;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  courierCompany: string | null;
  trackingNo: string | null;
  addressSnapshot: string | null;
  pickupCode: string | null;
  createdBy: string | null;
  fulfilledBy: string | null;
  confirmedBy: string | null;
  cancelledBy: string | null;
  createdAt: string;
  updatedAt: string;
  fulfilledAt: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
}

export interface DeliveryCreateInput {
  deliveryNo: string;
  rxId: string;
  patientId: string;
  accountId: string | null;
  channel: DeliveryChannel;
  addressSnapshot: string | null;
  pickupCode: string | null;
  createdBy: string;
}

export interface DeliveryStatusInput {
  id: string;
  to: DeliveryStatus;
  fulfilledBy?: string | null;
  confirmedBy?: string | null;
  cancelledBy?: string | null;
  courierCompany?: string | null;
  trackingNo?: string | null;
}

/* -------------------------------- 映射 -------------------------------- */

function mapDelivery(r: Record<string, unknown>): PrescriptionDelivery {
  return {
    id: String(r.id),
    deliveryNo: String(r.delivery_no),
    rxId: String(r.rx_id),
    patientId: String(r.patient_id),
    accountId: r.account_id != null ? String(r.account_id) : null,
    channel: r.channel as DeliveryChannel,
    status: r.status as DeliveryStatus,
    courierCompany: r.courier_company != null ? String(r.courier_company) : null,
    trackingNo: r.tracking_no != null ? String(r.tracking_no) : null,
    addressSnapshot: r.address_snapshot != null ? String(r.address_snapshot) : null,
    pickupCode: r.pickup_code != null ? String(r.pickup_code) : null,
    createdBy: r.created_by != null ? String(r.created_by) : null,
    fulfilledBy: r.fulfilled_by != null ? String(r.fulfilled_by) : null,
    confirmedBy: r.confirmed_by != null ? String(r.confirmed_by) : null,
    cancelledBy: r.cancelled_by != null ? String(r.cancelled_by) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    fulfilledAt: r.fulfilled_at != null ? String(r.fulfilled_at) : null,
    confirmedAt: r.confirmed_at != null ? String(r.confirmed_at) : null,
    cancelledAt: r.cancelled_at != null ? String(r.cancelled_at) : null,
  };
}

const DELIVERY_COLS =
  'id, delivery_no, rx_id, patient_id, account_id, channel, status, ' +
  'courier_company, tracking_no, address_snapshot, pickup_code, ' +
  'created_by, fulfilled_by, confirmed_by, cancelled_by, ' +
  'created_at, updated_at, fulfilled_at, confirmed_at, cancelled_at';

/* -------------------------------- 查询 -------------------------------- */

export async function getDeliveryById(
  id: string,
  db: DbExecutor = getDb(),
): Promise<PrescriptionDelivery | null> {
  const rows = await db`SELECT ${db.unsafe(DELIVERY_COLS)}
    FROM clinical.prescription_deliveries WHERE id = ${id}`;
  return rows.length ? mapDelivery(rows[0] as Record<string, unknown>) : null;
}

export async function getOpenDeliveryByRx(
  rxId: string,
  db: DbExecutor = getDb(),
): Promise<PrescriptionDelivery | null> {
  const rows = await db`SELECT ${db.unsafe(DELIVERY_COLS)}
    FROM clinical.prescription_deliveries
    WHERE rx_id = ${rxId} AND status <> 'cancelled'
    ORDER BY created_at DESC LIMIT 1`;
  return rows.length ? mapDelivery(rows[0] as Record<string, unknown>) : null;
}

export async function listDeliveriesByPatient(
  patientId: string,
  db: DbExecutor = getDb(),
): Promise<PrescriptionDelivery[]> {
  const rows = await db`SELECT ${db.unsafe(DELIVERY_COLS)}
    FROM clinical.prescription_deliveries
    WHERE patient_id = ${patientId} ORDER BY created_at DESC`;
  return rows.map((r) => mapDelivery(r as Record<string, unknown>));
}

export async function listAllDeliveries(
  status: string | undefined,
  db: DbExecutor = getDb(),
): Promise<PrescriptionDelivery[]> {
  const rows = status
    ? await db`SELECT ${db.unsafe(DELIVERY_COLS)}
        FROM clinical.prescription_deliveries
        WHERE status = ${status} ORDER BY created_at DESC`
    : await db`SELECT ${db.unsafe(DELIVERY_COLS)}
        FROM clinical.prescription_deliveries ORDER BY created_at DESC`;
  return rows.map((r) => mapDelivery(r as Record<string, unknown>));
}

/** 生成 6 位数字取货码（凭部分唯一索引兜底重试） */
export async function nextPickupCode(db: DbExecutor): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const rows = await db`SELECT 1 FROM clinical.prescription_deliveries
      WHERE pickup_code = ${code} AND status IN ('created','packed')`;
    if (!rows.length) return code;
  }
  return String(Date.now()).slice(-6);
}

/* -------------------------------- 写入 -------------------------------- */

/**
 * 创建配送单。返回 'created'（新建）或 'exists'（同处方已有有效单，幂等返回）。
 * 并发下部分唯一索引冲突 → 回查返回既有单。
 */
export async function createDelivery(
  input: DeliveryCreateInput,
  db: DbExecutor = getDb(),
): Promise<{ result: 'created' | 'exists'; delivery: PrescriptionDelivery }> {
  const existing = await getOpenDeliveryByRx(input.rxId, db);
  if (existing) return { result: 'exists', delivery: existing };

  try {
    const rows = await db`INSERT INTO clinical.prescription_deliveries
      (delivery_no, rx_id, patient_id, account_id, channel, status,
       address_snapshot, pickup_code, created_by)
    VALUES (${input.deliveryNo}, ${input.rxId}, ${input.patientId}, ${input.accountId},
            ${input.channel}, 'created', ${input.addressSnapshot}, ${input.pickupCode}, ${input.createdBy})
    RETURNING ${db.unsafe(DELIVERY_COLS)}`;
    return { result: 'created', delivery: mapDelivery(rows[0] as Record<string, unknown>) };
  } catch (err) {
    // 部分唯一索引冲突（并发建单）→ 回查既有单
    if (
      err instanceof Error &&
      /unique|duplicate|uq_open_delivery_per_rx/i.test(err.message)
    ) {
      const existing2 = await getOpenDeliveryByRx(input.rxId, db);
      if (existing2) return { result: 'exists', delivery: existing2 };
    }
    throw err;
  }
}

/** 状态推进：行锁 + status IN 校验的 CAS，返回推进后的单；非法转换/不存在返回 null */
export async function updateDeliveryStatus(
  input: DeliveryStatusInput,
  db: DbExecutor = getDb(),
): Promise<PrescriptionDelivery | null> {
  const allowed: Record<DeliveryStatus, DeliveryStatus[]> = {
    created: ['packed', 'cancelled'],
    packed: ['shipped', 'picked_up', 'cancelled'],
    shipped: ['delivered'],
    delivered: [],
    picked_up: [],
    cancelled: [],
  };

  const before = await getDeliveryById(input.id, db);
  if (!before) return null;
  if (!allowed[before.status].includes(input.to)) return null;

  const stamp = new Date().toISOString();
  const params: unknown[] = [input.id, before.status];
  const sets: string[] = [`status = $${params.length + 1}`];
  params.push(input.to);

  if (input.to === 'packed') {
    sets.push(`fulfilled_by = $${params.length + 1}`, `fulfilled_at = $${params.length + 2}`);
    params.push(input.fulfilledBy ?? null, stamp);
  } else if (input.to === 'shipped') {
    sets.push(
      `fulfilled_by = $${params.length + 1}`,
      `fulfilled_at = $${params.length + 2}`,
      `courier_company = $${params.length + 3}`,
      `tracking_no = $${params.length + 4}`,
    );
    params.push(input.fulfilledBy ?? null, stamp, input.courierCompany ?? null, input.trackingNo ?? null);
  } else if (input.to === 'delivered' || input.to === 'picked_up') {
    sets.push(`confirmed_by = $${params.length + 1}`, `confirmed_at = $${params.length + 2}`);
    params.push(input.confirmedBy ?? null, stamp);
  } else if (input.to === 'cancelled') {
    sets.push(`cancelled_by = $${params.length + 1}`, `cancelled_at = $${params.length + 2}`);
    params.push(input.cancelledBy ?? null, stamp);
  }

  const sql =
    `UPDATE clinical.prescription_deliveries SET ${sets.join(', ')} ` +
    `WHERE id = $1 AND status = $2 RETURNING ${DELIVERY_COLS}`;
  const rows = await db.unsafe(sql, params);
  if (!rows.length) return null;
  return mapDelivery(rows[0] as Record<string, unknown>);
}

/* -------------------------------- 事务辅助 -------------------------------- */

export async function createDeliveryWithTx(
  input: DeliveryCreateInput,
): Promise<{ result: 'created' | 'exists'; delivery: PrescriptionDelivery }> {
  return withTx(async (tx) => createDelivery(input, tx));
}

export async function updateDeliveryStatusWithTx(
  input: DeliveryStatusInput,
): Promise<PrescriptionDelivery | null> {
  return withTx(async (tx) => updateDeliveryStatus(input, tx));
}
