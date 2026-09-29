/**
 * 健澜科技 jlmedaios - 医保对账 Repository（M3-G）
 *
 * clinical.reconciliation_runs / reconciliation_items 读写。
 *
 * 并发与一致性：
 *  - 每次对账在事务内先删旧明细再插新明细，run_no 唯一；
 *  - 确认/挂起：FOR UPDATE 行锁 + 状态白名单（draft -> confirmed/disputed）；
 *  - DataScope：对账为财务汇总，管理员 all 可见。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';

export type ReconStatus = 'draft' | 'confirmed' | 'disputed';

export interface ReconRun {
  id: string;
  runNo: string;
  periodLabel: string;
  status: ReconStatus;
  totalItems: number;
  matchedItems: number;
  discrepancyItems: number;
  totalPosted: string;
  totalExpected: string;
  createdBy: string | null;
  createdAt: string;
  confirmedBy: string | null;
  confirmedAt: string | null;
  note: string | null;
  updatedAt: string;
}

export interface ReconItem {
  id: string;
  runId: string;
  feeItemId: string | null;
  itemCode: string | null;
  itemName: string | null;
  quantity: string;
  postedUnitPrice: string | null;
  postedAmount: string;
  catalogPrice: string | null;
  expectedAmount: string;
  diff: string;
  matched: boolean;
  note: string | null;
}

const RUN_COLS = `
  id, run_no, period_label, status, total_items, matched_items, discrepancy_items,
  total_posted, total_expected, created_by, created_at, confirmed_by, confirmed_at, note, updated_at
`;

const ITEM_COLS = `
  id, run_id, fee_item_id, item_code, item_name, quantity, posted_unit_price,
  posted_amount, catalog_price, expected_amount, diff, matched, note
`;

function mapRun(row: Record<string, unknown>): ReconRun {
  return {
    id: String(row.id),
    runNo: String(row.run_no),
    periodLabel: String(row.period_label),
    status: row.status as ReconStatus,
    totalItems: Number(row.total_items),
    matchedItems: Number(row.matched_items),
    discrepancyItems: Number(row.discrepancy_items),
    totalPosted: String(row.total_posted),
    totalExpected: String(row.total_expected),
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: String(row.created_at),
    confirmedBy: row.confirmed_by ? String(row.confirmed_by) : null,
    confirmedAt: row.confirmed_at ? String(row.confirmed_at) : null,
    note: row.note ? String(row.note) : null,
    updatedAt: String(row.updated_at),
  };
}

function mapItem(row: Record<string, unknown>): ReconItem {
  return {
    id: String(row.id),
    runId: String(row.run_id),
    feeItemId: row.fee_item_id ? String(row.fee_item_id) : null,
    itemCode: row.item_code ? String(row.item_code) : null,
    itemName: row.item_name ? String(row.item_name) : null,
    quantity: String(row.quantity),
    postedUnitPrice: row.posted_unit_price != null ? String(row.posted_unit_price) : null,
    postedAmount: String(row.posted_amount),
    catalogPrice: row.catalog_price != null ? String(row.catalog_price) : null,
    expectedAmount: String(row.expected_amount),
    diff: String(row.diff),
    matched: Boolean(row.matched),
    note: row.note ? String(row.note) : null,
  };
}

/**
 * 取已收费费用明细并左连目录价，供聚合器重算（纯取数，不写）。
 */
export interface FeeLine {
  feeItemId: string;
  itemCode: string | null;
  itemName: string | null;
  quantity: string;
  postedUnitPrice: string | null;
  postedAmount: string;
  catalogPrice: string | null;
}

export async function fetchChargedFeeLines(sql?: DbExecutor): Promise<FeeLine[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT f.id AS fee_item_id, f.item_code, f.item_name, f.quantity,
           f.unit_price AS posted_unit_price, f.amount AS posted_amount,
           c.price AS catalog_price
    FROM clinical.fee_items f
    LEFT JOIN clinical.charge_item_catalog c ON c.code = f.item_code
    WHERE f.status = 'settled'
    ORDER BY f.created_at ASC
  `;
  return (rows as Record<string, unknown>[]).map((r) => ({
    feeItemId: String(r.fee_item_id),
    itemCode: r.item_code ? String(r.item_code) : null,
    itemName: r.item_name ? String(r.item_name) : null,
    quantity: String(r.quantity),
    postedUnitPrice: r.posted_unit_price != null ? String(r.posted_unit_price) : null,
    postedAmount: String(r.posted_amount),
    catalogPrice: r.catalog_price != null ? String(r.catalog_price) : null,
  }));
}

/**
 * 写对账批次：run_no 唯一，重复对账先删旧明细再插新明细，状态重置 draft。
 */
export interface RunSummary {
  totalItems: number;
  matchedItems: number;
  discrepancyItems: number;
  totalPosted: string;
  totalExpected: string;
}

export async function upsertRun(
  input: {
    runNo: string;
    periodLabel: string;
    summary: RunSummary;
    lines: (FeeLine & { expectedAmount: string; diff: string; matched: boolean; note: string | null })[];
    createdBy: string;
  },
  tx: DbExecutor,
): Promise<ReconRun> {
  const runRows = await tx`
    INSERT INTO clinical.reconciliation_runs (
      run_no, period_label, status, total_items, matched_items, discrepancy_items,
      total_posted, total_expected, created_by
    ) VALUES (
      ${input.runNo}, ${input.periodLabel}, 'draft',
      ${input.summary.totalItems}, ${input.summary.matchedItems}, ${input.summary.discrepancyItems},
      ${input.summary.totalPosted}, ${input.summary.totalExpected}, ${input.createdBy}
    )
    ON CONFLICT (run_no) DO UPDATE SET
      period_label = EXCLUDED.period_label,
      status = 'draft',
      total_items = EXCLUDED.total_items,
      matched_items = EXCLUDED.matched_items,
      discrepancy_items = EXCLUDED.discrepancy_items,
      total_posted = EXCLUDED.total_posted,
      total_expected = EXCLUDED.total_expected,
      created_by = EXCLUDED.created_by,
      created_at = now(),
      confirmed_by = NULL,
      confirmed_at = NULL
    RETURNING ${tx.unsafe(RUN_COLS)}
  `;
  const run = mapRun(runRows[0] as Record<string, unknown>);

  await tx`DELETE FROM clinical.reconciliation_items WHERE run_id = ${run.id}`;
  for (const line of input.lines) {
    await tx`
      INSERT INTO clinical.reconciliation_items (
        run_id, fee_item_id, item_code, item_name, quantity, posted_unit_price,
        posted_amount, catalog_price, expected_amount, diff, matched, note
      ) VALUES (
        ${run.id}, ${line.feeItemId}, ${line.itemCode}, ${line.itemName}, ${line.quantity},
        ${line.postedUnitPrice}, ${line.postedAmount}, ${line.catalogPrice},
        ${line.expectedAmount}, ${line.diff}, ${line.matched}, ${line.note}
      )
    `;
  }
  return run;
}

export async function getRunById(id: string, sql?: DbExecutor): Promise<ReconRun | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(RUN_COLS)} FROM clinical.reconciliation_runs WHERE id = ${id}`;
  return rows.length > 0 ? mapRun(rows[0] as Record<string, unknown>) : null;
}

export async function listRuns(sql?: DbExecutor): Promise<ReconRun[]> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(RUN_COLS)} FROM clinical.reconciliation_runs ORDER BY created_at DESC`;
  return (rows as Record<string, unknown>[]).map(mapRun);
}

export async function listItems(runId: string, sql?: DbExecutor): Promise<ReconItem[]> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(ITEM_COLS)} FROM clinical.reconciliation_items WHERE run_id = ${runId} ORDER BY matched ASC, abs(diff) DESC`;
  return (rows as Record<string, unknown>[]).map(mapItem);
}

/** FOR UPDATE + 状态白名单：draft -> confirmed/disputed。0 行返回 null。 */
export async function setStatus(
  id: string,
  toStatus: 'confirmed' | 'disputed',
  opts: { reviewedBy: string; note?: string | null },
  tx: DbExecutor,
): Promise<ReconRun | null> {
  const locked = await tx`SELECT ${tx.unsafe(RUN_COLS)} FROM clinical.reconciliation_runs WHERE id = ${id} FOR UPDATE`;
  if (locked.length === 0) return null;
  const current = mapRun(locked[0] as Record<string, unknown>);
  if (current.status !== 'draft') return null;
  const rows = await tx`
    UPDATE clinical.reconciliation_runs SET
      status = ${toStatus},
      confirmed_by = ${opts.reviewedBy},
      confirmed_at = now(),
      note = COALESCE(${opts.note ?? null}, note)
    WHERE id = ${id}
    RETURNING ${tx.unsafe(RUN_COLS)}
  `;
  return rows.length > 0 ? mapRun(rows[0] as Record<string, unknown>) : null;
}

export async function countRuns(sql?: DbExecutor): Promise<number> {
  const db = sql ?? getDb();
  const rows = await db<{ n: number }[]>`SELECT count(*) AS n FROM clinical.reconciliation_runs`;
  return Number(rows[0]?.n ?? 0);
}
