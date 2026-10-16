/**
 * 健澜科技 jlmedaios - 医院成本核算 V3 纯函数（M240-B）
 *
 * buildCostAccountingV3Report / allocateCosts / calculateDRGCost
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 分摊成本（纯函数）。
 *
 * @param costs 成本
 * @param bases 分摊基础
 * @returns 分摊
 */
export function allocateCosts(costs: number, bases: { dept: string; share: number }[]): { dept: string; amount: number }[] {
  return bases.map((b) => ({ dept: b.dept, amount: Math.round(costs * b.share) }));
}

/**
 * 计算 DRG 成本（纯函数）。
 *
 * @param drg DRG
 * @param costs 成本
 * @returns 成本
 */
export function calculateDRGCost(drg: string, costs: { labor: number; material: number; overhead: number }): { drg: string; total: number; standard: number } {
  const total = costs.labor + costs.material + costs.overhead;
  return { drg, total, standard: Math.round(total * 1.1) };
}

/** 成本核算 V3 报告输出 */
export interface CostAccountingV3Report {
  timeRange: string;
  dept: { fullCost: number; allocated: number };
  project: { cost: number };
  drg: { standard: number; cases: number };
  budget: { controlled: number };
  suggestions: string[];
}

/**
 * 构建成本核算 V3 报告。
 *
 * @param timeRange 时间范围
 * @returns 成本核算 V3 报告
 */
export function buildCostAccountingV3Report(timeRange: string): CostAccountingV3Report {
  return {
    timeRange,
    dept: { fullCost: 500000000, allocated: 300000000 },
    project: { cost: 200000000 },
    drg: { standard: 100000, cases: 5000 },
    budget: { controlled: 450000000 },
    suggestions: ["降低科室全成本", "优化DRG标准成本"],
  };
}
