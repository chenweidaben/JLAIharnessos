/**
 * 健澜科技 jlmedaios - 质控缺陷趋势图 V14 聚合器（M506-A）
 *
 * 纯函数：趋势图数据点构建 + 趋势图聚合。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 趋势图数据点 */
export interface TrendChartV14 {
  month: string;
  count: number;
}

/** 聚合结果 */
export interface TrendAggregateV14 {
  total: number;
  avg: number;
  max: number;
  min: number;
}

/**
 * 构建趋势图数据点。
 *
 * @param month 月份（YYYY-MM）
 * @param count 缺陷数
 * @returns 趋势图数据点
 */
export function buildTrendChart(month: string, count: number): TrendChartV14 {
  return { month, count };
}

/**
 * 聚合趋势图（总数 + 月均 + 峰值 + 谷值）。
 *
 * @param data 趋势图数据点数组
 * @returns 聚合结果
 */
export function aggregateTrendChart(data: TrendChartV14[]): TrendAggregateV14 {
  if (data.length === 0) {
    return { total: 0, avg: 0, max: 0, min: 0 };
  }
  // 手算聚合：total=sum，avg=Math.round(total/n)，max=Math.max，min=Math.min
  const total = data.reduce((acc, d) => acc + d.count, 0);
  const avg = Math.round(total / data.length);
  const max = Math.max(...data.map((d) => d.count));
  const min = Math.min(...data.map((d) => d.count));
  return { total, avg, max, min };
}
