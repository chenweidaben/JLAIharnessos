/**
 * 健澜科技 jlmedaios - 血库库存 V13 纯函数（M328-D）
 *
 * countBloodByTypeV13 / countNearExpiryBloodV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 血液单位 */
export interface BloodUnitV13 {
  bloodType: "A" | "B" | "O" | "AB";
  daysToExpiry: number;
}

/** 血型库存结果 */
export interface BloodStockByTypeV13 {
  A: number;
  B: number;
  O: number;
  AB: number;
}

/**
 * A/B/O/AB 四型库存单位数（纯函数）：分组计数。
 *
 * @param bloods 血液单位列表
 * @returns 四型库存数
 */
export function countBloodByTypeV13(bloods: BloodUnitV13[]): BloodStockByTypeV13 {
  const result: BloodStockByTypeV13 = { A: 0, B: 0, O: 0, AB: 0 };
  for (const b of bloods) {
    result[b.bloodType] += 1;
  }
  return result;
}

/**
 * 保质期预警（纯函数）：7 天内到期。
 *
 * @param bloods 血液单位列表
 * @returns 近效期数
 */
export function countNearExpiryBloodV13(bloods: BloodUnitV13[]): number {
  return bloods.filter((b) => b.daysToExpiry <= 7).length;
}
