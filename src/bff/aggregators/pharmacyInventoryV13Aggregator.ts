/**
 * 健澜科技 jlmedaios - 药品库存 V13 纯函数（M328-C）
 *
 * countNearExpiryDrugsV13 / countOutOfStockDrugsV13 / computeInventoryVarianceRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 药品项 */
export interface PharmacyDrugV13 {
  name: string;
  stock: number;
  daysToExpiry: number;
  hasVariance: boolean;
}

/**
 * 近效期药品数（纯函数）：90 天内到期。
 *
 * @param drugs 药品列表
 * @returns 近效期数
 */
export function countNearExpiryDrugsV13(drugs: PharmacyDrugV13[]): number {
  return drugs.filter((d) => d.daysToExpiry <= 90).length;
}

/**
 * 缺货品种数（纯函数）：库存 = 0。
 *
 * @param drugs 药品列表
 * @returns 缺货数
 */
export function countOutOfStockDrugsV13(drugs: PharmacyDrugV13[]): number {
  return drugs.filter((d) => d.stock === 0).length;
}

/**
 * 盘点差异率（纯函数）：差异品种/总品种×100。
 *
 * @param drugs 药品列表
 * @returns 差异率百分比
 */
export function computeInventoryVarianceRateV13(drugs: PharmacyDrugV13[]): number {
  if (drugs.length === 0) return 0;
  const variance = drugs.filter((d) => d.hasVariance).length;
  return Math.round((variance / drugs.length) * 100);
}
