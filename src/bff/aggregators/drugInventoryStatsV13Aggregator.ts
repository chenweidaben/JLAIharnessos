/**
 * 健澜科技 jlmedaios - 药品库存管理 V13 纯函数（M359-C，stats 避让已有 drugInventory）
 *
 * computeDrugInventoryTurnoverRateV13 / computeNearExpiryDrugRatioV13 / computeMonthlyDrugShortageTimesV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 药品库存管理记录 */
export interface DrugInventoryStatsRecordV13 {
  outboundAmount: number;
  avgInventoryAmount: number;
  nearExpiryCategory: number;
  totalCategory: number;
  monthlyShortageTimes: number;
}

/**
 * 药品库存周转率（纯函数）：出库金额/平均库存金额，保留 2 位小数。
 *
 * @param records 药品库存管理记录列表
 * @returns 库存周转率
 */
export function computeDrugInventoryTurnoverRateV13(records: DrugInventoryStatsRecordV13[]): number {
  const outbound = records.reduce((acc, r) => acc + r.outboundAmount, 0);
  const avgInventory = records.reduce((acc, r) => acc + r.avgInventoryAmount, 0);
  if (avgInventory === 0) return 0;
  return Math.round((outbound / avgInventory) * 100) / 100;
}

/**
 * 近效期药品占比（纯函数）：近效期品种数/总品种数×100，保留 2 位小数。
 *
 * @param records 药品库存管理记录列表
 * @returns 近效期药品占比百分比
 */
export function computeNearExpiryDrugRatioV13(records: DrugInventoryStatsRecordV13[]): number {
  const nearExpiry = records.reduce((acc, r) => acc + r.nearExpiryCategory, 0);
  const total = records.reduce((acc, r) => acc + r.totalCategory, 0);
  if (total === 0) return 0;
  return Math.round((nearExpiry / total) * 10000) / 100;
}

/**
 * 月度缺药次数（纯函数）：求和。
 *
 * @param records 药品库存管理记录列表
 * @returns 月度缺药次数
 */
export function computeMonthlyDrugShortageTimesV13(records: DrugInventoryStatsRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.monthlyShortageTimes, 0);
}
