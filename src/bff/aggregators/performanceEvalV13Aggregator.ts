/**
 * 健澜科技 jlmedaios - 绩效考核 V13 纯函数（M384-C）
 *
 * computePerformanceEvalCompletionRateV13 / computeExcellentRatioV13 / computeAppealCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 绩效考核记录 */
export interface PerformanceEvalRecordV13 {
  completedCount: number;
  totalCount: number;
  excellentCount: number;
  totalEvalCount: number;
  appealCount: number;
}

/**
 * 绩效考核完成率（纯函数）：已完成考核数/应考核数×100，保留 2 位小数。
 *
 * @param records 绩效考核记录列表
 * @returns 绩效考核完成率百分比
 */
export function computePerformanceEvalCompletionRateV13(records: PerformanceEvalRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCount, 0);
  if (total === 0) return 0;
  const completed = records.reduce((acc, r) => acc + r.completedCount, 0);
  return Math.round((completed / total) * 10000) / 100;
}

/**
 * 优秀比例（纯函数）：优秀人数/考核总人数×100，保留 2 位小数。
 *
 * @param records 绩效考核记录列表
 * @returns 优秀比例百分比
 */
export function computeExcellentRatioV13(records: PerformanceEvalRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalEvalCount, 0);
  if (total === 0) return 0;
  const excellent = records.reduce((acc, r) => acc + r.excellentCount, 0);
  return Math.round((excellent / total) * 10000) / 100;
}

/**
 * 考核申诉数（纯函数）：求和。
 *
 * @param records 绩效考核记录列表
 * @returns 考核申诉数
 */
export function computeAppealCountV13(records: PerformanceEvalRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.appealCount, 0);
}
