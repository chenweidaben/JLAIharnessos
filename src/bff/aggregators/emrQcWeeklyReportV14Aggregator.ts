/**
 * 健澜科技 jlmedaios - 质控周报 V14 聚合器（M487-B）
 *
 * 纯函数：周报构建 + 周指标聚合。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质控周报 */
export interface WeeklyReportV14 {
  week: string;
  metrics: { day: string; value: number }[];
}

/**
 * 构建周报。
 *
 * @param week 周标识
 * @param metrics 每日指标
 * @returns 周报
 */
export function buildWeeklyReport(week: string, metrics: { day: string; value: number }[]): WeeklyReportV14 {
  return { week, metrics };
}

/**
 * 聚合周指标：days + avgValue 保留 1 位小数 + maxValue。
 *
 * @param metrics 每日指标
 * @returns 聚合结果
 */
export function aggregateWeeklyMetrics(metrics: { day: string; value: number }[]): { days: number; avgValue: number; maxValue: number } {
  const days = metrics.length;
  if (days === 0) {
    return { days: 0, avgValue: 0, maxValue: 0 };
  }
  const sum = metrics.reduce((acc, m) => acc + m.value, 0);
  const avgValue = Math.round((sum / days) * 10) / 10;
  const maxValue = Math.max(...metrics.map((m) => m.value));
  return { days, avgValue, maxValue };
}
