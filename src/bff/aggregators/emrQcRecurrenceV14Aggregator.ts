/**
 * 健澜科技 jlmedaios - 质控复发预警 V14 聚合器（M496-C）
 *
 * 纯函数：缺陷复发检测 + 复发报告构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 复发检测结果 */
export interface RecurrenceV14 {
  issue: string;
  previousCount: number;
  currentCount: number;
  recurrence: boolean;
}

/** 复发报告 */
export interface RecurrenceReportV14 {
  total: number;
  recurrent: number;
  rate: number;
}

/**
 * 检测缺陷复发（currentCount >= previousCount 则复发）。
 *
 * @param issue 问题
 * @param previousCount 上期缺陷数
 * @param currentCount 本期缺陷数
 * @returns 复发检测结果
 */
export function detectRecurrence(issue: string, previousCount: number, currentCount: number): RecurrenceV14 {
  // 手算复发判定：currentCount >= previousCount 则复发，减少则不复发
  const recurrence = currentCount >= previousCount;
  return { issue, previousCount, currentCount, recurrence };
}

/**
 * 构建复发报告（total+recurrent+rate%）。
 *
 * @param recurrences 复发检测结果数组
 * @returns 复发报告
 */
export function buildRecurrenceReport(recurrences: { issue: string; recurrence: boolean }[]): RecurrenceReportV14 {
  const total = recurrences.length;
  if (total === 0) {
    return { total: 0, recurrent: 0, rate: 0 };
  }
  // 手算复发率：rate=Math.ceil(recurrent/total×100)，分母不能为 0
  const recurrent = recurrences.filter((r) => r.recurrence).length;
  const rate = Math.ceil((recurrent / total) * 100);
  return { total, recurrent, rate };
}
