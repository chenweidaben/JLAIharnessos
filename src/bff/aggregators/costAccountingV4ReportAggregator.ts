/**
 * 健澜科技 jlmedaios - 成本核算 V4 纯函数（M250-B）
 *
 * buildCostAccountingV4Report / allocateCostsV4 / calculateDRGCostV4
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 分摊成本 V4（纯函数）。
 *
 * @param costs 成本
 * @param bases 分摊基础
 * @returns 分摊
 */
export function allocateCostsV4(costs: { admin: number; logistics: number }, bases: { clinical: number; medTech: number }): { clinical: number; medTech: number } {
  const total = bases.clinical + bases.medTech;
  const adminShare = costs.admin * (bases.clinical / Math.max(total, 1));
  const logisticsShare = costs.logistics * (bases.clinical / Math.max(total, 1));
  return {
    clinical: Math.round(adminShare + logisticsShare),
    medTech: Math.round(costs.admin + costs.logistics - adminShare - logisticsShare),
  };
}

/**
 * 计算 DRG 成本 V4（纯函数）。
 *
 * @param drg DRG
 * @param costs 成本
 * @returns 成本
 */
export function calculateDRGCostV4(drg: { weight: number; standard: number }, costs: { actual: number }): { drg: string; standard: number; actual: number; variance: number } {
  const variance = Math.round((costs.actual - drg.standard) * 100) / 100;
  return { drg: `DRG-${drg.weight}`, standard: drg.standard, actual: costs.actual, variance };
}

/** 成本核算 V4 报告输出 */
export interface CostAccountingV4Report {
  timeRange: string;
  department: { direct: number; indirect: number; full: number; profit: number };
  service: { labor: number; equipment: number; supplies: number };
  drg: { standard: number; actual: number; pathway: number };
  allocation: { admin: number; logistics: number; medTech: number };
  control: { budget: number; saving: number; waste: number };
  suggestions: string[];
}

/**
 * 构建成本核算 V4 报告。
 *
 * @param timeRange 时间范围
 * @returns 成本核算 V4 报告
 */
export function buildCostAccountingV4Report(timeRange: string): CostAccountingV4Report {
  return {
    timeRange,
    department: { direct: 10000, indirect: 3000, full: 13000, profit: 2000 },
    service: { labor: 5000, equipment: 2000, supplies: 3000 },
    drg: { standard: 8000, actual: 7500, pathway: 7000 },
    allocation: { admin: 1000, logistics: 800, medTech: 1200 },
    control: { budget: 15000, saving: 500, waste: 200 },
    suggestions: ["降低耗材成本", "优化 DRG 成本结构"],
  };
}
