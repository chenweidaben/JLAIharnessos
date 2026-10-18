/**
 * 健澜科技 jlmedaios - 质控年报 V14 聚合器（M487-D，M487 收官）
 *
 * 纯函数：年报构建 + 年指标聚合。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质控年报 */
export interface AnnualReportV14 {
  year: string;
  metrics: { quarter: string; value: number }[];
}

/**
 * 构建年报。
 *
 * @param year 年标识
 * @param metrics 每季指标
 * @returns 年报
 */
export function buildAnnualReport(year: string, metrics: { quarter: string; value: number }[]): AnnualReportV14 {
  return { year, metrics };
}

/**
 * 聚合年指标：quarters + avgValue 保留 1 位小数 + maxValue。
 *
 * @param metrics 每季指标
 * @returns 聚合结果
 */
export function aggregateAnnualMetrics(metrics: { quarter: string; value: number }[]): { quarters: number; avgValue: number; maxValue: number } {
  const quarters = metrics.length;
  if (quarters === 0) {
    return { quarters: 0, avgValue: 0, maxValue: 0 };
  }
  const sum = metrics.reduce((acc, m) => acc + m.value, 0);
  const avgValue = Math.round((sum / quarters) * 10) / 10;
  const maxValue = Math.max(...metrics.map((m) => m.value));
  return { quarters, avgValue, maxValue };
}
