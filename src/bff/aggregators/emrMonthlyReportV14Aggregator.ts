/**
 * 健澜科技 jlmedaios - 病历质控月度报告自动生成 V14 聚合器（M466-D，M466 收官）
 *
 * 纯函数：月报生成（合格率+得分计算）+ 环比趋势对比。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 月报统计入参 */
export interface MonthlyStatsV14 {
  totalRecords: number;
  passCount: number;
  blockCount: number;
  majorCount: number;
  minorCount: number;
}

/** 月度报告 */
export interface MonthlyReportV14 extends MonthlyStatsV14 {
  month: string;
  passRate: number;
  score: number;
}

/** 环比趋势结果 */
export interface TrendResultV14 {
  change: number;
  direction: "up" | "down" | "flat";
}

/**
 * 生成月报：计算合格率（保留 2 位小数）和质控得分（clamp 0-100）。
 *
 * @param month 月份（YYYY-MM）
 * @param stats 统计数据
 * @returns 月度报告
 */
export function buildMonthlyReport(month: string, stats: MonthlyStatsV14): MonthlyReportV14 {
  const passRate = stats.totalRecords > 0
    ? Math.round((stats.passCount / stats.totalRecords) * 10000) / 100
    : 0;
  const rawScore = 100 - stats.blockCount * 15 - stats.majorCount * 8 - stats.minorCount * 3;
  const score = Math.max(0, Math.min(100, rawScore));
  return { ...stats, month, passRate, score };
}

/**
 * 计算环比趋势：current - previous。
 *
 * @param current 本月值
 * @param previous 上月值
 * @returns 趋势结果（change + direction）
 */
export function computeTrend(current: number, previous: number): TrendResultV14 {
  const change = Math.round((current - previous) * 100) / 100;
  if (change > 0) return { change, direction: "up" };
  if (change < 0) return { change, direction: "down" };
  return { change: 0, direction: "flat" };
}
