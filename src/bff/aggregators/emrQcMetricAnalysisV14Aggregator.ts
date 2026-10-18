/**
 * 健澜科技 jlmedaios - 质控指标分析 V14 聚合器（M483-D，M483 收官）
 *
 * 纯函数：分析报告构建 + 指标趋势对比。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 指标分析报告 */
export interface MetricAnalysisReportV14 {
  metricName: string;
  currentValue: number;
  previousValue: number;
  change: number;
  direction: "up" | "down" | "flat";
}

/** 趋势对比结果 */
export interface MetricTrendV14 {
  change: number;
  direction: "up" | "down" | "flat";
}

/**
 * 指标趋势对比：change = current - previous。
 *
 * @param current 当前值
 * @param previous 上期值
 * @returns 趋势对比结果
 */
export function compareMetricTrend(current: number, previous: number): MetricTrendV14 {
  const change = current - previous;
  if (change > 0) {
    return { change, direction: "up" };
  }
  if (change < 0) {
    return { change, direction: "down" };
  }
  return { change: 0, direction: "flat" };
}

/**
 * 构建分析报告（含变化率）。
 *
 * @param metricName 指标名
 * @param currentValue 当前值
 * @param previousValue 上期值
 * @returns 分析报告
 */
export function buildAnalysisReport(metricName: string, currentValue: number, previousValue: number): MetricAnalysisReportV14 {
  const trend = compareMetricTrend(currentValue, previousValue);
  return {
    metricName,
    currentValue,
    previousValue,
    change: trend.change,
    direction: trend.direction,
  };
}
