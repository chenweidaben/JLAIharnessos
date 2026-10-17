/**
 * 健澜科技 jlmedaios - 药库管理 V13 纯函数（M380-C）
 *
 * computeDrugInStockVarietyCountV13 / computeInventoryTurnoverRateV13 / computeDrugLossRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 药库管理记录 */
export interface DrugStorageRecordV13 {
  inStockVarietyCount: number;
  outboundAmount: number;
  avgInventoryAmount: number;
  lossAmount: number;
  totalInventoryAmount: number;
}

/**
 * 药品在库品种数（纯函数）：求和。
 *
 * @param records 药库管理记录列表
 * @returns 药品在库品种数
 */
export function computeDrugInStockVarietyCountV13(records: DrugStorageRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.inStockVarietyCount, 0);
}

/**
 * 库存周转率（纯函数）：出库金额/平均库存金额×100，保留 2 位小数。
 *
 * @param records 药库管理记录列表
 * @returns 库存周转率百分比
 */
export function computeInventoryTurnoverRateV13(records: DrugStorageRecordV13[]): number {
  const avgInventory = records.reduce((acc, r) => acc + r.avgInventoryAmount, 0);
  if (avgInventory === 0) return 0;
  const outbound = records.reduce((acc, r) => acc + r.outboundAmount, 0);
  return Math.round((outbound / avgInventory) * 10000) / 100;
}

/**
 * 药品报损率（纯函数）：报损金额/库存总金额×100，保留 2 位小数。
 *
 * @param records 药库管理记录列表
 * @returns 药品报损率百分比
 */
export function computeDrugLossRateV13(records: DrugStorageRecordV13[]): number {
  const totalInventory = records.reduce((acc, r) => acc + r.totalInventoryAmount, 0);
  if (totalInventory === 0) return 0;
  const loss = records.reduce((acc, r) => acc + r.lossAmount, 0);
  return Math.round((loss / totalInventory) * 10000) / 100;
}
