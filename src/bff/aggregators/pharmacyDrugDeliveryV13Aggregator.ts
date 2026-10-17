/**
 * 健澜科技 jlmedaios - 药品配送 V13 纯函数（M406-C）
 *
 * computeDrugDeliveryTimelyRateV13 / computeDrugStockoutRateV13 / computeColdChainDrugPassRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 药品配送记录 */
export interface PharmacyDrugDeliveryRecordV13 {
  timely: number;
  should: number;
  stockout: number;
  purchase: number;
  coldPass: number;
  coldTotal: number;
}

/**
 * 药品配送及时率（纯函数）：及时配送次数/应配送总次数×100，保留 2 位小数。
 *
 * @param records 药品配送记录列表
 * @returns 药品配送及时率百分比
 */
export function computeDrugDeliveryTimelyRateV13(records: PharmacyDrugDeliveryRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.should, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timely, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 药品断货率（纯函数）：断货次数/采购总次数×100，保留 2 位小数。
 *
 * @param records 药品配送记录列表
 * @returns 药品断货率百分比
 */
export function computeDrugStockoutRateV13(records: PharmacyDrugDeliveryRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.purchase, 0);
  if (total === 0) return 0;
  const stockout = records.reduce((acc, r) => acc + r.stockout, 0);
  return Math.round((stockout / total) * 10000) / 100;
}

/**
 * 冷链药品合格率（纯函数）：合格批次/检查总批次×100，保留 2 位小数。
 *
 * @param records 药品配送记录列表
 * @returns 冷链药品合格率百分比
 */
export function computeColdChainDrugPassRateV13(records: PharmacyDrugDeliveryRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.coldTotal, 0);
  if (total === 0) return 0;
  const passed = records.reduce((acc, r) => acc + r.coldPass, 0);
  return Math.round((passed / total) * 10000) / 100;
}
