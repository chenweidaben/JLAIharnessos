/**
 * 健澜科技 jlmedaios - 财务管理 V13 纯函数（M364-B）
 *
 * computeRevenueGrowthRateV13 / computeCostControlRateV13 / computeAssetLiabilityRatioV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 财务管理记录 */
export interface FinanceMgmtRecordV13 {
  currentRevenue: number;
  previousRevenue: number;
  budgetCost: number;
  actualCost: number;
  totalLiabilities: number;
  totalAssets: number;
}

/**
 * 收入增长率（纯函数）：(本期收入-上期收入)/上期收入×100，保留 2 位小数。
 *
 * @param records 财务管理记录列表
 * @returns 收入增长率百分比
 */
export function computeRevenueGrowthRateV13(records: FinanceMgmtRecordV13[]): number {
  const current = records.reduce((acc, r) => acc + r.currentRevenue, 0);
  const previous = records.reduce((acc, r) => acc + r.previousRevenue, 0);
  if (previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 10000) / 100;
}

/**
 * 成本控制率（纯函数）：(预算成本-实际成本)/预算成本×100，保留 2 位小数。
 *
 * @param records 财务管理记录列表
 * @returns 成本控制率百分比
 */
export function computeCostControlRateV13(records: FinanceMgmtRecordV13[]): number {
  const budget = records.reduce((acc, r) => acc + r.budgetCost, 0);
  const actual = records.reduce((acc, r) => acc + r.actualCost, 0);
  if (budget === 0) return 0;
  return Math.round(((budget - actual) / budget) * 10000) / 100;
}

/**
 * 资产负债率（纯函数）：负债总额/资产总额×100，保留 2 位小数。
 *
 * @param records 财务管理记录列表
 * @returns 资产负债率百分比
 */
export function computeAssetLiabilityRatioV13(records: FinanceMgmtRecordV13[]): number {
  const liabilities = records.reduce((acc, r) => acc + r.totalLiabilities, 0);
  const assets = records.reduce((acc, r) => acc + r.totalAssets, 0);
  if (assets === 0) return 0;
  return Math.round((liabilities / assets) * 10000) / 100;
}
