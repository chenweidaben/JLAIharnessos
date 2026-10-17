/**
 * 健澜科技 jlmedaios - 药房库存预警 V13 纯函数（M312-B）
 *
 * checkLowStockV13 / suggestReorderV13 / checkExpiringSoonV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 药房药品 */
export interface PharmacyItemV13 {
  itemId: string;
  name: string;
  currentStock: number;
  safetyStock: number;
  expiryDaysFromNow: number;
}

/** 补货建议 */
export interface ReorderSuggestionV13 {
  itemId: string;
  name: string;
  suggestQty: number;
}

/**
 * 低库存识别（纯函数）：currentStock < safetyStock → 预警。
 *
 * @param items 药品列表
 * @returns 低库存药品
 */
export function checkLowStockV13(items: PharmacyItemV13[]): PharmacyItemV13[] {
  return items.filter((it) => it.currentStock < it.safetyStock);
}

/**
 * 补货建议（纯函数）：suggestQty = safetyStock×2 - currentStock，下限 0。
 *
 * @param item 药品
 * @returns 补货建议
 */
export function suggestReorderV13(item: PharmacyItemV13): ReorderSuggestionV13 {
  const qty = item.safetyStock * 2 - item.currentStock;
  return {
    itemId: item.itemId,
    name: item.name,
    suggestQty: Math.max(qty, 0),
  };
}

/**
 * 近效期提醒（纯函数）：expiryDaysFromNow <= days → 近效期。
 *
 * @param items 药品列表
 * @param days 阈值天数
 * @returns 近效期药品
 */
export function checkExpiringSoonV13(items: PharmacyItemV13[], days: number): PharmacyItemV13[] {
  return items.filter((it) => it.expiryDaysFromNow <= days);
}
