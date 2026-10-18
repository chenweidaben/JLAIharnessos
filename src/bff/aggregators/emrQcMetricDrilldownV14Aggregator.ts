/**
 * 健澜科技 jlmedaios - 质控指标钻取 V14 聚合器（M484-C）
 *
 * 纯函数：钻取明细构建 + 维度筛选。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 钻取明细 */
export interface DrilldownV14 {
  metricName: string;
  dimensions: { dept: string; value: number }[];
}

/** 维度条目 */
export interface DimensionItemV14 {
  dept: string;
  value: number;
}

/**
 * 构建钻取明细。
 *
 * @param metricName 指标名
 * @param dimensions 维度数据
 * @returns 钻取明细
 */
export function buildDrilldown(metricName: string, dimensions: DimensionItemV14[]): DrilldownV14 {
  return { metricName, dimensions };
}

/**
 * 按科室筛选维度数据。
 *
 * @param dimensions 维度数据
 * @param dept 科室名
 * @returns 筛选结果
 */
export function filterByDimension(dimensions: DimensionItemV14[], dept: string): DimensionItemV14[] {
  return dimensions.filter((d) => d.dept === dept);
}
