/**
 * 健澜科技 jlmedaios - 质控日报 V14 聚合器（M487-A）
 *
 * 纯函数：日报构建 + 当日指标聚合。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质控日报 */
export interface DailyReportV14 {
  date: string;
  metrics: { name: string; value: number }[];
}

/**
 * 构建日报。
 *
 * @param date 日期
 * @param metrics 指标数组
 * @returns 日报
 */
export function buildDailyReport(date: string, metrics: { name: string; value: number }[]): DailyReportV14 {
  return { date, metrics };
}

/**
 * 聚合当日指标：count + avgValue 保留 1 位小数。
 *
 * @param metrics 指标数组
 * @returns 聚合结果
 */
export function aggregateDailyMetrics(metrics: { name: string; value: number }[]): { count: number; avgValue: number } {
  const count = metrics.length;
  const sum = metrics.reduce((acc, m) => acc + m.value, 0);
  const avgValue = count === 0 ? 0 : Math.round((sum / count) * 10) / 10;
  return { count, avgValue };
}
