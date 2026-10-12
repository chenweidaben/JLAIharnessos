/**
 * 健澜科技 jlmedaios - 在院费用监控 repo（M22-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb, type DbExecutor } from '../pool.js';

const db = getDb();

export interface MonitorRow {
  id: string; visitId: string; groupCode: string | null; budgetCost: string | null;
  accumulatedCost: string; ratio: string | null; level: string;
  dischargeReviewReminded: boolean; lastSnapshotAt: string;
}

function map(r: Record<string, unknown>): MonitorRow {
  return {
    id: String(r.id), visitId: String(r.visit_id),
    groupCode: r.group_code == null ? null : String(r.group_code),
    budgetCost: r.budget_cost == null ? null : String(r.budget_cost),
    accumulatedCost: String(r.accumulated_cost),
    ratio: r.ratio == null ? null : String(r.ratio),
    level: String(r.level),
    dischargeReviewReminded: Boolean(r.discharge_review_reminded),
    lastSnapshotAt: String(r.last_snapshot_at),
  };
}

export async function upsertSnapshot(
  input: { visitId: string; groupCode?: string | null; budgetCost?: number | null; accumulatedCost: number; ratio?: number | null; level: 'ok' | 'warn' | 'over' },
  tx: DbExecutor = db,
): Promise<MonitorRow> {
  const rows = await tx`
    INSERT INTO clinical.inpatient_cost_monitor (visit_id, group_code, budget_cost, accumulated_cost, ratio, level, last_snapshot_at)
    VALUES (${input.visitId}, ${input.groupCode ?? null}, ${input.budgetCost ?? null}, ${input.accumulatedCost}, ${input.ratio ?? null}, ${input.level}, now())
    ON CONFLICT (visit_id) DO UPDATE SET
      group_code = EXCLUDED.group_code, budget_cost = EXCLUDED.budget_cost,
      accumulated_cost = EXCLUDED.accumulated_cost, ratio = EXCLUDED.ratio,
      level = EXCLUDED.level, last_snapshot_at = now()
    RETURNING id, visit_id, group_code, budget_cost, accumulated_cost, ratio, level, discharge_review_reminded, last_snapshot_at`;
  return map(rows[0] as Record<string, unknown>);
}

export async function listMonitors(): Promise<MonitorRow[]> {
  const rows = await db`
    SELECT id, visit_id, group_code, budget_cost, accumulated_cost, ratio, level, discharge_review_reminded, last_snapshot_at
    FROM clinical.inpatient_cost_monitor
    ORDER BY CASE level WHEN 'over' THEN 0 WHEN 'warn' THEN 1 ELSE 2 END, ratio DESC NULLS LAST LIMIT 200`;
  return rows.map((r) => map(r as Record<string, unknown>));
}

export async function getByVisit(visitId: string, tx: DbExecutor = db): Promise<MonitorRow | null> {
  const rows = await tx`
    SELECT id, visit_id, group_code, budget_cost, accumulated_cost, ratio, level, discharge_review_reminded, last_snapshot_at
    FROM clinical.inpatient_cost_monitor WHERE visit_id=${visitId}`;
  return rows.length > 0 ? map(rows[0] as Record<string, unknown>) : null;
}

/** CAS：未提醒 → 已提醒。0 行即幂等重复。 */
export async function markDischargeReminded(visitId: string, tx: DbExecutor = db): Promise<MonitorRow | null> {
  const rows = await tx`
    UPDATE clinical.inpatient_cost_monitor SET discharge_review_reminded=true
    WHERE visit_id=${visitId} AND discharge_review_reminded=false
    RETURNING id, visit_id, group_code, budget_cost, accumulated_cost, ratio, level, discharge_review_reminded, last_snapshot_at`;
  return rows.length > 0 ? map(rows[0] as Record<string, unknown>) : null;
}
