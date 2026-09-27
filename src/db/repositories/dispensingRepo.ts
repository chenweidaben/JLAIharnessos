/**
 * 健澜科技 jlmedaios - 处方发药/调剂记录 Repository（M2-A）
 *
 * clinical.prescription_dispensings。幂等键（处方:明细:发药人）唯一，
 * ON CONFLICT DO NOTHING 保证并发/重复发药请求只产生一条记录、库存只扣一次
 * （库存扣减与本记录在同一事务）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';
import { toJson } from './helpers.js';

export interface Dispensing {
  id: string;
  prescriptionId: string;
  itemId: string | null;
  drugId: string | null;
  drugCode: string | null;
  drugName: string;
  warehouse: string;
  batchNo: string | null;
  quantity: number;
  unit: string | null;
  dispensedBy: string;
  dispensedAt: string;
  idempotencyKey: string;
  overrideReason: string | null;
  overrideBy: string | null;
  cdsHits: Record<string, unknown>[];
  createdAt: string;
}

export interface DispensingInput {
  prescriptionId: string;
  itemId?: string | null;
  drugId?: string | null;
  drugCode?: string | null;
  drugName: string;
  warehouse: string;
  batchNo?: string | null;
  quantity: number;
  unit?: string | null;
  dispensedBy: string;
  idempotencyKey: string;
  overrideReason?: string | null;
  overrideBy?: string | null;
  cdsHits?: Record<string, unknown>[];
}

const COLS = `id, prescription_id, item_id, drug_id, drug_code, drug_name, warehouse,
  batch_no, quantity, unit, dispensed_by, dispensed_at, idempotency_key,
  override_reason, override_by, cds_hits, created_at`;

function mapRow(row: Record<string, unknown>): Dispensing {
  return {
    id: String(row.id),
    prescriptionId: String(row.prescription_id),
    itemId: row.item_id ? String(row.item_id) : null,
    drugId: row.drug_id ? String(row.drug_id) : null,
    drugCode: row.drug_code ? String(row.drug_code) : null,
    drugName: String(row.drug_name),
    warehouse: String(row.warehouse),
    batchNo: row.batch_no ? String(row.batch_no) : null,
    quantity: Number(row.quantity),
    unit: row.unit ? String(row.unit) : null,
    dispensedBy: String(row.dispensed_by),
    dispensedAt: String(row.dispensed_at),
    idempotencyKey: String(row.idempotency_key),
    overrideReason: row.override_reason ? String(row.override_reason) : null,
    overrideBy: row.override_by ? String(row.override_by) : null,
    cdsHits: (row.cds_hits as Record<string, unknown>[]) ?? [],
    createdAt: String(row.created_at),
  };
}

/**
 * 幂等写发药记录。
 *  - inserted=true：本次新建；
 *  - inserted=false：幂等键已存在（并发/重复请求），返回既有记录，调用方不重复扣库存。
 */
export async function insertDispensingOnce(
  tx: DbExecutor,
  input: DispensingInput,
): Promise<{ dispensing: Dispensing; inserted: boolean }> {
  const rows = await tx`
    INSERT INTO clinical.prescription_dispensings
      (prescription_id, item_id, drug_id, drug_code, drug_name, warehouse, batch_no,
       quantity, unit, dispensed_by, idempotency_key, override_reason, override_by, cds_hits)
    VALUES (${input.prescriptionId}, ${input.itemId ?? null}, ${input.drugId ?? null},
      ${input.drugCode ?? null}, ${input.drugName}, ${input.warehouse}, ${input.batchNo ?? null},
      ${input.quantity}, ${input.unit ?? null}, ${input.dispensedBy}, ${input.idempotencyKey},
      ${input.overrideReason ?? null}, ${input.overrideBy ?? null},
      ${tx.json(toJson(input.cdsHits ?? []))})
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING ${tx.unsafe(COLS)}
  `;
  if (rows.length > 0) {
    return { dispensing: mapRow(rows[0] as Record<string, unknown>), inserted: true };
  }
  const existing = await tx`
    SELECT ${tx.unsafe(COLS)} FROM clinical.prescription_dispensings
    WHERE idempotency_key = ${input.idempotencyKey}
  `;
  return { dispensing: mapRow(existing[0] as Record<string, unknown>), inserted: false };
}

/** 按处方列出发药记录。 */
export async function listDispensingsByPrescription(
  prescriptionId: string,
  sql?: DbExecutor,
): Promise<Dispensing[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(COLS)} FROM clinical.prescription_dispensings
    WHERE prescription_id = ${prescriptionId} ORDER BY dispensed_at
  `;
  return (rows as Record<string, unknown>[]).map(mapRow);
}

/** 最近发药记录（发药记录总览，可按药房过滤，按时间倒序）。 */
export async function listRecentDispensings(
  options?: { warehouse?: string; limit?: number },
  sql?: DbExecutor,
): Promise<Dispensing[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(COLS)} FROM clinical.prescription_dispensings
    WHERE (${options?.warehouse ?? null}::text IS NULL OR warehouse = ${options?.warehouse ?? null})
    ORDER BY dispensed_at DESC, id DESC
    LIMIT ${options?.limit ?? 200}
  `;
  return (rows as Record<string, unknown>[]).map(mapRow);
}
