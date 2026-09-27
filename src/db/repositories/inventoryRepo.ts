/**
 * 健澜科技 jlmedaios - 药品库存 Repository（M2-A）
 *
 * clinical.drug_inventory + clinical.inventory_movements。
 * 关键：出库使用条件原子更新（WHERE quantity >= ?），配合数据库 CHECK(quantity>=0)
 * 双重杜绝超发/负库存；每次出库写流水，库存变动可审计。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';
import { toJson } from './helpers.js';

export interface Inventory {
  id: string;
  drugId: string;
  drugCode: string | null;
  genericName: string | null;
  warehouse: string;
  batchNo: string | null;
  quantity: number;
  unit: string;
  expiryDate: string | null;
  createdAt: string;
  updatedAt: string;
}

const INV_COLS = `i.id, i.drug_id, i.warehouse, i.batch_no, i.quantity, i.unit,
  i.expiry_date, i.created_at, i.updated_at, d.drug_code, d.generic_name`;

function mapRow(row: Record<string, unknown>): Inventory {
  return {
    id: String(row.id),
    drugId: String(row.drug_id),
    drugCode: row.drug_code ? String(row.drug_code) : null,
    genericName: row.generic_name ? String(row.generic_name) : null,
    warehouse: String(row.warehouse),
    batchNo: row.batch_no ? String(row.batch_no) : null,
    quantity: Number(row.quantity),
    unit: String(row.unit),
    expiryDate: row.expiry_date ? String(row.expiry_date) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/** 库存列表（可按药房/药品编码/名称过滤）。 */
export async function listInventory(
  options?: { warehouse?: string; keyword?: string; limit?: number },
  sql?: DbExecutor,
): Promise<Inventory[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(INV_COLS)}
    FROM clinical.drug_inventory i
    JOIN clinical.drug_catalog d ON d.id = i.drug_id
    WHERE (${options?.warehouse ?? null}::text IS NULL OR i.warehouse = ${options?.warehouse ?? null})
      AND (${options?.keyword ?? null}::text IS NULL
           OR d.generic_name ILIKE ${'%' + (options?.keyword ?? '') + '%'}
           OR d.drug_code ILIKE ${'%' + (options?.keyword ?? '') + '%'})
    ORDER BY i.warehouse, d.generic_name, i.expiry_date NULLS LAST
    LIMIT ${options?.limit ?? 300}
  `;
  return (rows as Record<string, unknown>[]).map(mapRow);
}

/** 某药品在指定药房的各批次（FEFO：近效期优先）。 */
export async function listBatchesForDrug(
  drugId: string,
  warehouse: string,
  sql?: DbExecutor,
): Promise<Inventory[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(INV_COLS)}
    FROM clinical.drug_inventory i
    JOIN clinical.drug_catalog d ON d.id = i.drug_id
    WHERE i.drug_id = ${drugId} AND i.warehouse = ${warehouse}
    ORDER BY i.expiry_date NULLS LAST, i.batch_no
  `;
  return (rows as Record<string, unknown>[]).map(mapRow);
}

export interface DeductInput {
  drugId: string;
  warehouse: string;
  /** 指定批次；缺省按 FEFO 自动选择近效期未过期批次 */
  batchNo?: string | null;
  qty: number;
}

export interface DeductResult {
  inventory: Inventory;
}

/**
 * 原子扣减库存。
 *  - 指定批次：直接条件更新该批次；
 *  - 未指定：先 FEFO 选批次，再条件更新（WHERE quantity >= qty）。
 * 返回 null 表示库存不足 / 无可用批次（调用方回滚并明确报错）。
 */
export async function deductInventory(
  tx: DbExecutor,
  input: DeductInput,
): Promise<DeductResult | null> {
  if (!(input.qty > 0)) return null;

  let targetId: string | null = null;
  if (input.batchNo) {
    const rows = await tx`
      SELECT id FROM clinical.drug_inventory
      WHERE drug_id = ${input.drugId} AND warehouse = ${input.warehouse} AND batch_no = ${input.batchNo}
    `;
    targetId = rows.length ? String((rows[0] as Record<string, unknown>).id) : null;
  } else {
    const rows = await tx`
      SELECT id FROM clinical.drug_inventory
      WHERE drug_id = ${input.drugId} AND warehouse = ${input.warehouse}
        AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
        AND quantity >= ${input.qty}
      ORDER BY expiry_date NULLS LAST, batch_no
      LIMIT 1
    `;
    targetId = rows.length ? String((rows[0] as Record<string, unknown>).id) : null;
  }
  if (!targetId) return null;

const upd = await tx`
    UPDATE clinical.drug_inventory
    SET quantity = quantity - ${input.qty}, updated_at = now()
    WHERE id = ${targetId} AND quantity >= ${input.qty}
    RETURNING id
  `;
  if (upd.length === 0) return null;
  // RETURNING 仅含 drug_inventory 列，补 join 取药品编码/名称
  const full = await tx`
    SELECT ${tx.unsafe(INV_COLS)}
    FROM clinical.drug_inventory i JOIN clinical.drug_catalog d ON d.id = i.drug_id
    WHERE i.id = ${targetId}
  `;
  return { inventory: mapRow(full[0] as Record<string, unknown>) };
}

export interface MovementInput {
  drugId: string;
  warehouse: string;
  batchNo?: string | null;
  changeQty: number; // 出库为负
  balanceAfter: number;
  reason: string;
  refType?: string | null;
  refId?: string | null;
  actorId: string;
}

/** 写库存流水。 */
export async function insertMovement(tx: DbExecutor, input: MovementInput): Promise<void> {
  await tx`
    INSERT INTO clinical.inventory_movements
      (drug_id, warehouse, batch_no, change_qty, balance_after, reason, ref_type, ref_id, actor_id)
    VALUES (${input.drugId}, ${input.warehouse}, ${input.batchNo ?? null}, ${input.changeQty},
      ${input.balanceAfter}, ${input.reason}, ${input.refType ?? null}, ${input.refId ?? null},
      ${input.actorId})
  `;
}

/** 盘点/补货：原子增加库存（用于演示与真实收货，保持工具完整）。 */
export async function receiveStock(
  input: { drugId: string; warehouse: string; batchNo?: string; qty: number; actorId: string },
): Promise<Inventory | null> {
  const db = getDb();
  return db.begin(async (tx) => {
    const rows = await tx`
      UPDATE clinical.drug_inventory
      SET quantity = quantity + ${input.qty}, updated_at = now()
      WHERE drug_id = ${input.drugId} AND warehouse = ${input.warehouse}
        AND (${input.batchNo ?? null}::text IS NULL OR batch_no = ${input.batchNo ?? null})
      RETURNING id
    `;
    if (rows.length === 0) return null;
    const id = String((rows[0] as Record<string, unknown>).id);
    const full = await tx`
      SELECT ${tx.unsafe(INV_COLS)}
      FROM clinical.drug_inventory i JOIN clinical.drug_catalog d ON d.id = i.drug_id
      WHERE i.id = ${id}
    `;
    const inv = mapRow(full[0] as Record<string, unknown>);
    await insertMovement(tx, {
      drugId: input.drugId, warehouse: input.warehouse, batchNo: input.batchNo ?? null,
      changeQty: input.qty, balanceAfter: inv.quantity, reason: 'receive', actorId: input.actorId,
    });
    return inv;
  });
}

export interface Movement {
  id: string;
  drugId: string | null;
  warehouse: string;
  batchNo: string | null;
  changeQty: number;
  balanceAfter: number | null;
  reason: string;
  refType: string | null;
  refId: string | null;
  actorId: string | null;
  createdAt: string;
}

const MOV_COLS = `id, drug_id, warehouse, batch_no, change_qty, balance_after, reason,
  ref_type, ref_id, actor_id, created_at`;

function mapMovement(row: Record<string, unknown>): Movement {
  return {
    id: String(row.id),
    drugId: row.drug_id ? String(row.drug_id) : null,
    warehouse: String(row.warehouse),
    batchNo: row.batch_no ? String(row.batch_no) : null,
    changeQty: Number(row.change_qty),
    balanceAfter: row.balance_after !== null ? Number(row.balance_after) : null,
    reason: String(row.reason),
    refType: row.ref_type ? String(row.ref_type) : null,
    refId: row.ref_id ? String(row.ref_id) : null,
    actorId: row.actor_id ? String(row.actor_id) : null,
    createdAt: String(row.created_at),
  };
}

/** 库存流水查询（可按药品/药房/原因过滤，按时间倒序）。 */
export async function listMovements(
  options?: { drugId?: string; warehouse?: string; reason?: string; limit?: number },
  sql?: DbExecutor,
): Promise<Movement[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(MOV_COLS)}
    FROM clinical.inventory_movements
    WHERE (${options?.drugId ?? null}::uuid IS NULL OR drug_id = ${options?.drugId ?? null})
      AND (${options?.warehouse ?? null}::text IS NULL OR warehouse = ${options?.warehouse ?? null})
      AND (${options?.reason ?? null}::text IS NULL OR reason = ${options?.reason ?? null})
    ORDER BY created_at DESC, id DESC
    LIMIT ${options?.limit ?? 200}
  `;
  return (rows as Record<string, unknown>[]).map(mapMovement);
}

// 保持 toJson 引用（明细 JSON 序列化复用统一工具）。
export { toJson };
