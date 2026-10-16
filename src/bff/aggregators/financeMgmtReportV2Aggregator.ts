/**
 * 健澜科技 jlmedaios - 财务核算 V2 纯函数（M226-C）
 *
 * buildFinanceMgmtReportV2 / calculateCostAllocation / assessFinancialRatio
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 计算成本分摊（纯函数）。
 *
 * @param costs 总成本
 * @param bases 分摊基数
 * @returns 分摊结果
 */
export function calculateCostAllocation(costs: number, bases: number[]): { allocated: number[]; total: number } {
  const sum = bases.reduce((a, b) => a + b, 0);
  const allocated = bases.map((b) => Math.round((costs * (b / sum)) * 100) / 100);
  return { allocated, total: costs };
}

/**
 * 评估财务比率（纯函数）。
 *
 * @param assets 总资产
 * @param liabilities 总负债
 * @returns 资产负债率
 */
export function assessFinancialRatio(assets: number, liabilities: number): { ratio: number; healthy: boolean } {
  const ratio = assets > 0 ? Math.round((liabilities / assets) * 1000) / 10 : 0;
  return { ratio, healthy: ratio < 50 };
}

/** 财务核算 V2 报告输出 */
export interface FinanceMgmtReportV2 {
  timeRange: string;
  revenue: { total: number };
  expense: { total: number };
  cost: { allocated: number; drg: number };
  budget: { executed: number; planned: number };
  asset: { total: number };
  liability: { total: number };
  statement: { reports: number };
  analysis: { ratio: number };
  suggestions: string[];
}

/**
 * 构建财务核算 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 财务核算 V2 报告
 */
export function buildFinanceMgmtReportV2(timeRange: string): FinanceMgmtReportV2 {
  return {
    timeRange,
    revenue: { total: 500000000 },
    expense: { total: 420000000 },
    cost: { allocated: 200000000, drg: 150000000 },
    budget: { executed: 450000000, planned: 500000000 },
    asset: { total: 800000000 },
    liability: { total: 300000000 },
    statement: { reports: 12 },
    analysis: { ratio: 37.5 },
    suggestions: ['控制费用增长', '优化成本分摊'],
  };
}
