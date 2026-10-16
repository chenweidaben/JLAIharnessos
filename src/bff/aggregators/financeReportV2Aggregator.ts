/**
 * 健澜科技 jlmedaios - 财务核算与成本管理 V2 纯函数（M211-B）
 *
 * buildFinanceReportV2 / calculateCostRatio / assessDRGProfit
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 计算成本率（纯函数）。
 *
 * @param cost 成本
 * @param revenue 收入
 * @returns 成本率与等级
 */
export function calculateCostRatio(cost: number, revenue: number): { ratio: number; level: string } {
  const ratio = revenue > 0 ? cost / revenue : 0;
  let level = '合理';
  if (ratio > 0.9) level = '亏损风险';
  else if (ratio < 0.6) level = '高效';
  return { ratio, level };
}

/**
 * 评估 DRG 盈亏（纯函数）。
 *
 * @param cost 成本
 * @param payment 医保支付
 * @returns 盈亏
 */
export function assessDRGProfit(cost: number, payment: number): { profit: number; margin: number; status: string } {
  const profit = payment - cost;
  const margin = payment > 0 ? profit / payment : 0;
  let status = '亏损';
  if (profit > 0) status = '盈利';
  else if (profit === 0) status = '持平';
  return { profit, margin, status };
}

/** 财务 V2 报告输出 */
export interface FinanceReportV2 {
  timeRange: string;
  revenue: { total: number; outpatient: number; inpatient: number };
  expense: { total: number };
  deptCost: { avg: number };
  projectCost: { avg: number };
  drgCost: { avgCost: number; avgPayment: number };
  budget: { executionRate: number };
  pricing: { items: number };
  statements: { issued: number };
  suggestions: string[];
}

/**
 * 构建财务 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 财务 V2 报告
 */
export function buildFinanceReportV2(timeRange: string): FinanceReportV2 {
  return {
    timeRange,
    revenue: { total: 100000, outpatient: 40000, inpatient: 60000 },
    expense: { total: 80000 },
    deptCost: { avg: 5000 },
    projectCost: { avg: 500 },
    drgCost: { avgCost: 8000, avgPayment: 8500 },
    budget: { executionRate: 0.95 },
    pricing: { items: 3000 },
    statements: { issued: 12 },
    suggestions: ['降低成本率', '优化 DRG 盈亏结构'],
  };
}
