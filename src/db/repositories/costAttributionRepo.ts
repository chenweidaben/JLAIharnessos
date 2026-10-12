/**
 * 健澜科技 jlmedaios - 成本归因 repo（M22-C）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb } from '../pool.js';

const db = getDb();

export interface CategoryBudgetRow {
  category: string;
  expectedAmount: string;
}

/** 按 group_code 取分类预算。 */
export async function listCategoryBudgets(groupCode: string): Promise<CategoryBudgetRow[]> {
  const rows = await db`
    SELECT category, expected_amount
    FROM clinical.drg_budget_categories WHERE group_code=${groupCode}`;
  return rows.map((r) => ({ category: String(r.category), expectedAmount: String(r.expected_amount) }));
}

/** 按 visit 汇总各类别实际费用（billing 费用项 GROUP BY category）。 */
export async function listActualByCategory(visitId: string): Promise<{ category: string; amount: string }[]> {
  // billing 费用项表：billing_items.category；无 category 行按 other 兜底
  try {
    const rows = await db`
      SELECT category, SUM(amount) AS amount
      FROM clinical.billing_items WHERE visit_id=${visitId}
      GROUP BY category`;
    return rows.map((r) => ({ category: String(r.category), amount: String(r.amount) }));
  } catch {
    return [];
  }
}

export async function upsertCategoryBudget(
  input: { groupCode: string; category: string; expectedAmount: number },
): Promise<CategoryBudgetRow> {
  const rows = await db`
    INSERT INTO clinical.drg_budget_categories (group_code, category, expected_amount)
    VALUES (${input.groupCode}, ${input.category}, ${input.expectedAmount})
    ON CONFLICT (group_code, category) DO UPDATE SET expected_amount = EXCLUDED.expected_amount
    RETURNING category, expected_amount`;
  return { category: String(rows[0].category), expectedAmount: String(rows[0].expected_amount) };
}
