/**
 * 健澜科技 jlmedaios - 耗材库存 V13 纯函数（M328-B）
 *
 * countLowStockItemsV13 / countNearExpiryItemsV13 / countMonthlyUsageV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 耗材项 */
export interface ConsumableItemV13 {
  name: string;
  stock: number;
  safetyStock: number;
  daysToExpiry: number;
  monthlyUsage: number;
}

/**
 * 低库存预警数（纯函数）：库存 < 安全库存。
 *
 * @param items 耗材列表
 * @returns 低库存数
 */
export function countLowStockItemsV13(items: ConsumableItemV13[]): number {
  return items.filter((i) => i.stock < i.safetyStock).length;
}

/**
 * 近效期耗材数（纯函数）：30 天内到期。
 *
 * @param items 耗材列表
 * @returns 近效期数
 */
export function countNearExpiryItemsV13(items: ConsumableItemV13[]): number {
  return items.filter((i) => i.daysToExpiry <= 30).length;
}

/**
 * 本月领用量汇总（纯函数）：求和。
 *
 * @param items 耗材列表
 * @returns 本月领用量
 */
export function countMonthlyUsageV13(items: ConsumableItemV13[]): number {
  return items.reduce((acc, i) => acc + i.monthlyUsage, 0);
}
