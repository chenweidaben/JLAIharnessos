/**
 * 健澜科技 jlmedaios - 成本归因前端类型（M22-C）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
export interface AttributionRow {
  category: string;
  actual: number;
  expected: number;
  variance: number;
  contributionPct: number;
  top: boolean;
}
export interface AttributionResult {
  visitId: string;
  groupCode: string;
  rows: AttributionRow[];
}
