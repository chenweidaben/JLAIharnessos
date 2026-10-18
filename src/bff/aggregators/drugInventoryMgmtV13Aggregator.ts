/**
 * 健澜科技 jlmedaios - 药品库存管理 V13 纯函数（M455-B，药品供应与库存管理组）
 *
 * computeDrugInventoryTurnoverRateV13 / computeDrugInventoryTurnoverComplianceRateV13 / computeDrugInventoryStockoutRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 药品库存管理记录 */
export interface DrugInventoryMgmtRecordV13 {
  outbound: number;
  avgInventory: number;
  qualified: number;
  totalItem: number;
  stockout: number;
}

/**
 * 药品库存周转率（纯函数）：药品出库金额/平均库存金额×100，保留 2 位小数。
 *
 * @param records 药品库存管理记录列表
 * @returns 药品库存周转率百分比
 */
export function computeDrugInventoryTurnoverRateV13(records: DrugInventoryMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.avgInventory, 0);
  if (total === 0) return 0;
  const outbound = records.reduce((acc, r) => acc + r.outbound, 0);
  return Math.round((outbound / total) * 10000) / 100;
}

/**
 * 库存周转率达标率（纯函数）：达标药品品种数/药品品种总数×100，保留 2 位小数。
 *
 * @param records 药品库存管理记录列表
 * @returns 库存周转率达标率百分比
 */
export function computeDrugInventoryTurnoverComplianceRateV13(records: DrugInventoryMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalItem, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualified, 0);
  return Math.round((qualified / total) * 10000) / 100;
}

/**
 * 缺货发生率（纯函数，反向指标越低越好）：缺货药品品种数/药品品种总数×100，保留 2 位小数。
 *
 * @param records 药品库存管理记录列表
 * @returns 缺货发生率百分比
 */
export function computeDrugInventoryStockoutRateV13(records: DrugInventoryMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalItem, 0);
  if (total === 0) return 0;
  const stockout = records.reduce((acc, r) => acc + r.stockout, 0);
  return Math.round((stockout / total) * 10000) / 100;
}
