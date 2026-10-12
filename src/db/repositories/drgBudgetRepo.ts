/**
 * 健澜科技 jlmedaios - DRG 病组预算 repo（M22-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb, type DbExecutor } from '../pool.js';

const db = getDb();

export interface BudgetRow {
  id: string; groupCode: string; version: string; expectedCost: string; warningRatio: string;
}
export interface AlertRow {
  id: string; visitId: string | null; groupCode: string; actualCost: string | null;
  budgetCost: string | null; ratio: string | null; level: string; acknowledged: boolean; createdAt: string;
}

function mapBudget(r: Record<string, unknown>): BudgetRow {
  return {
    id: String(r.id), groupCode: String(r.group_code), version: String(r.version),
    expectedCost: String(r.expected_cost), warningRatio: String(r.warning_ratio),
  };
}
function mapAlert(r: Record<string, unknown>): AlertRow {
  return {
    id: String(r.id), visitId: r.visit_id == null ? null : String(r.visit_id),
    groupCode: String(r.group_code),
    actualCost: r.actual_cost == null ? null : String(r.actual_cost),
    budgetCost: r.budget_cost == null ? null : String(r.budget_cost),
    ratio: r.ratio == null ? null : String(r.ratio),
    level: String(r.level), acknowledged: Boolean(r.acknowledged), createdAt: String(r.created_at),
  };
}

export async function upsertBudget(
  input: { groupCode: string; version?: string; expectedCost: number; warningRatio?: number },
  tx: DbExecutor = db,
): Promise<BudgetRow> {
  const rows = await tx`
    INSERT INTO clinical.drg_group_budgets (group_code, version, expected_cost, warning_ratio)
    VALUES (${input.groupCode}, ${input.version ?? 'v1'}, ${input.expectedCost}, ${input.warningRatio ?? 1.1})
    ON CONFLICT (group_code, version) DO UPDATE
      SET expected_cost = EXCLUDED.expected_cost, warning_ratio = EXCLUDED.warning_ratio
    RETURNING id, group_code, version, expected_cost, warning_ratio`;
  return mapBudget(rows[0] as Record<string, unknown>);
}

export async function getBudgetByGroup(groupCode: string, tx: DbExecutor = db): Promise<BudgetRow | null> {
  const rows = await tx`
    SELECT id, group_code, version, expected_cost, warning_ratio
    FROM clinical.drg_group_budgets WHERE group_code=${groupCode} ORDER BY effective_from DESC LIMIT 1`;
  return rows.length > 0 ? mapBudget(rows[0] as Record<string, unknown>) : null;
}

export async function listBudgets(): Promise<BudgetRow[]> {
  const rows = await db`SELECT id, group_code, version, expected_cost, warning_ratio FROM clinical.drg_group_budgets ORDER BY group_code`;
  return rows.map((r) => mapBudget(r as Record<string, unknown>));
}

export async function createAlert(
  input: { visitId?: string | null; groupCode: string; actualCost: number; budgetCost: number; ratio: number; level: 'warn' | 'over' },
  tx: DbExecutor = db,
): Promise<AlertRow> {
  const rows = await tx`
    INSERT INTO clinical.drg_cost_alerts (visit_id, group_code, actual_cost, budget_cost, ratio, level)
    VALUES (${input.visitId ?? null}, ${input.groupCode}, ${input.actualCost}, ${input.budgetCost}, ${input.ratio}, ${input.level})
    RETURNING id, visit_id, group_code, actual_cost, budget_cost, ratio, level, acknowledged, created_at`;
  return mapAlert(rows[0] as Record<string, unknown>);
}

export async function listAlerts(onlyUnack: boolean): Promise<AlertRow[]> {
  const rows = onlyUnack
    ? await db`SELECT id, visit_id, group_code, actual_cost, budget_cost, ratio, level, acknowledged, created_at FROM clinical.drg_cost_alerts WHERE acknowledged=false ORDER BY created_at DESC LIMIT 200`
    : await db`SELECT id, visit_id, group_code, actual_cost, budget_cost, ratio, level, acknowledged, created_at FROM clinical.drg_cost_alerts ORDER BY created_at DESC LIMIT 200`;
  return rows.map((r) => mapAlert(r as Record<string, unknown>));
}

export async function ackAlert(id: string, ackBy: string, tx: DbExecutor = db): Promise<AlertRow | null> {
  const rows = await tx`
    UPDATE clinical.drg_cost_alerts SET acknowledged=true, acknowledged_by=${ackBy}, acknowledged_at=now()
    WHERE id=${id} AND acknowledged=false
    RETURNING id, visit_id, group_code, actual_cost, budget_cost, ratio, level, acknowledged, created_at`;
  return rows.length > 0 ? mapAlert(rows[0] as Record<string, unknown>) : null;
}
