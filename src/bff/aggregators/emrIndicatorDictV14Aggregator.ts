/**
 * 健澜科技 jlmedaios - 病历质控指标字典管理 V14 聚合器（M472-A 新规格）
 *
 * 纯函数：创建指标字典条目 + 按名称关键词搜索。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 指标方向 */
export type IndicatorDirectionV14 = "higher" | "lower";

/** 指标字典条目 */
export interface IndicatorDictV14 {
  id: string;
  name: string;
  unit: string;
  direction: IndicatorDirectionV14;
}

/**
 * 创建指标字典条目。
 *
 * @param name 指标名称
 * @param unit 单位
 * @param direction 方向（higher=越高越好，lower=越低越好）
 * @returns 指标字典条目
 */
export function buildIndicatorDict(
  name: string,
  unit: string,
  direction: IndicatorDirectionV14,
): IndicatorDictV14 {
  return {
    id: `IND-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    unit,
    direction,
  };
}

/**
 * 按 name includes 关键词过滤指标字典。
 *
 * @param items 指标字典列表
 * @param keyword 搜索关键词
 * @returns 匹配的指标条目
 */
export function searchIndicators(
  items: IndicatorDictV14[],
  keyword: string,
): IndicatorDictV14[] {
  if (!keyword.trim()) return items;
  return items.filter((item) => item.name.includes(keyword));
}
