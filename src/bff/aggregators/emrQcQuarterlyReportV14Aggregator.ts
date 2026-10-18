/**
 * 健澜科技 jlmedaios - 质控季报 V14 聚合器（M487-C）
 *
 * 纯函数：季报构建 + 季指标聚合。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质控季报 */
export interface QuarterlyReportV14 {
  quarter: string;
  metrics: { month: string; value: number }[];
}

/**
 * 构建季报。
 *
 * @param quarter 季标识
 * @param metrics 每月指标
 * @returns 季报
 */
export function buildQuarterlyReport(quarter: string, metrics: { month: string; value: number }[]): QuarterlyReportV14 {
  return { quarter, metrics };
}

/**
 * 聚合季指标：months + avgValue 保留 1 位小数 + maxValue。
 *
 * @param metrics 每月指标
 * @returns 聚合结果
 */
export function aggregateQuarterlyMetrics(metrics: { month: string; value: number }[]): { months: number; avgValue: number; maxValue: number } {
  const months = metrics.length;
  if (months === 0) {
    return { months: 0, avgValue: 0, maxValue: 0 };
  }
  const sum = metrics.reduce((acc, m) => acc + m.value, 0);
  const avgValue = Math.round((sum / months) * 10) / 10;
  const maxValue = Math.max(...metrics.map((m) => m.value));
  return { months, avgValue, maxValue };
}
