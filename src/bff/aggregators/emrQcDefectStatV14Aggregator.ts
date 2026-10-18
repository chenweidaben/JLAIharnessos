/**
 * 健澜科技 jlmedaios - 质控缺陷统计 V14 聚合器（M500-A）
 *
 * 纯函数：缺陷统计构建 + 统计聚合。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 缺陷统计 */
export interface DefectStatV14 {
  category: string;
  count: number;
}

/** 聚合结果 */
export interface DefectAggregateV14 {
  total: number;
  categories: number;
}

/**
 * 构建缺陷统计。
 *
 * @param category 缺陷分类
 * @param count 缺陷数量
 * @returns 缺陷统计
 */
export function buildDefectStat(category: string, count: number): DefectStatV14 {
  return { category, count };
}

/**
 * 聚合缺陷统计（总缺陷数 + 分类数）。
 *
 * @param stats 缺陷统计数组
 * @returns 聚合结果
 */
export function aggregateDefectStat(stats: DefectStatV14[]): DefectAggregateV14 {
  // 手算聚合：total=各分类 count 之和，categories=数组长度
  const total = stats.reduce((sum, s) => sum + s.count, 0);
  return {
    total,
    categories: stats.length,
  };
}
