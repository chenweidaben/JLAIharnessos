/**
 * 健澜科技 jlmedaios - 超支病例成本归因纯函数（M22-C）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export interface CategoryInput {
  category: string;
  actual: number;
  expected: number;
}
export interface AttributionRow {
  category: string;
  actual: number;
  expected: number;
  variance: number;
  contributionPct: number; // 占总超支贡献度（仅正 variance 计入），0~1
  top: boolean;
}

export function attributeCosts(input: CategoryInput[], topN = 1): AttributionRow[] {
  const rows = input.map((r) => ({
    ...r,
    variance: r.actual - r.expected,
    contributionPct: 0,
    top: false,
  }));
  const totalOver = rows.reduce((s, r) => s + Math.max(0, r.variance), 0);
  rows.forEach((r) => {
    if (totalOver > 0 && r.variance > 0) r.contributionPct = r.variance / totalOver;
  });
  rows.sort((a, b) => b.contributionPct - a.contributionPct || b.variance - a.variance);
  rows.slice(0, topN).forEach((r) => { r.top = true; });
  return rows;
}
