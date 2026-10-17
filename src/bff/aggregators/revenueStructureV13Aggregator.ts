/**
 * 健澜科技 jlmedaios - 收入结构 V13 纯函数（M329-C）
 *
 * computeRevenueShareV13 / computeTotalRevenueV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 收入分类 */
export interface RevenueCategoryV13 {
  category: "医疗" | "药品" | "检查" | "化验";
  amount: number;
}

/** 收入占比项 */
export interface RevenueShareItemV13 {
  category: string;
  share: number;
}

/**
 * 总收入（纯函数）：求和。
 *
 * @param revenue 收入分类列表
 * @returns 总收入
 */
export function computeTotalRevenueV13(revenue: RevenueCategoryV13[]): number {
  return revenue.reduce((acc, r) => acc + r.amount, 0);
}

/**
 * 收入占比（纯函数）：各类/总收入×100。
 *
 * @param revenue 收入分类列表
 * @returns 各类占比
 */
export function computeRevenueShareV13(revenue: RevenueCategoryV13[]): RevenueShareItemV13[] {
  const total = computeTotalRevenueV13(revenue);
  if (total === 0) return [];
  return revenue.map((r) => ({
    category: r.category,
    share: Math.round((r.amount / total) * 100),
  }));
}
