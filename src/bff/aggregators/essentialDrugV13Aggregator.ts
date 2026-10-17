/**
 * 健澜科技 jlmedaios - 基本药物管理 V13 纯函数（M368-D，M368 收官）
 *
 * computeEssentialDrugAvailabilityRateV13 / computeEssentialDrugUsageRateV13 / computeBiddingDrugPurchaseRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 基本药物管理记录 */
export interface EssentialDrugRecordV13 {
  shouldStockVariety: number;
  stockedVariety: number;
  essentialDrugAmount: number;
  totalDrugAmount: number;
  biddingPurchaseAmount: number;
  totalPurchaseAmount: number;
}

/**
 * 基本药物配备率（纯函数）：配备品种数/应配备品种数×100，保留 2 位小数。
 *
 * @param records 基本药物管理记录列表
 * @returns 基本药物配备率百分比
 */
export function computeEssentialDrugAvailabilityRateV13(records: EssentialDrugRecordV13[]): number {
  const should = records.reduce((acc, r) => acc + r.shouldStockVariety, 0);
  if (should === 0) return 0;
  const stocked = records.reduce((acc, r) => acc + r.stockedVariety, 0);
  return Math.round((stocked / should) * 10000) / 100;
}

/**
 * 基本药物使用率（纯函数）：基本药物金额/药品总金额×100，保留 2 位小数。
 *
 * @param records 基本药物管理记录列表
 * @returns 基本药物使用率百分比
 */
export function computeEssentialDrugUsageRateV13(records: EssentialDrugRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalDrugAmount, 0);
  if (total === 0) return 0;
  const essential = records.reduce((acc, r) => acc + r.essentialDrugAmount, 0);
  return Math.round((essential / total) * 10000) / 100;
}

/**
 * 中标药品采购率（纯函数）：中标采购金额/药品总采购金额×100，保留 2 位小数。
 *
 * @param records 基本药物管理记录列表
 * @returns 中标药品采购率百分比
 */
export function computeBiddingDrugPurchaseRateV13(records: EssentialDrugRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalPurchaseAmount, 0);
  if (total === 0) return 0;
  const bidding = records.reduce((acc, r) => acc + r.biddingPurchaseAmount, 0);
  return Math.round((bidding / total) * 10000) / 100;
}
