/**
 * 健澜科技 jlmedaios - 临床路径执行率 V13 纯函数（M333-A）
 *
 * computeEnrollmentRateV13 / computeCompletionRateV13 / computeVariationRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 临床路径记录 */
export interface PathwayRecordV13 {
  eligibleCount: number;
  enrolledCount: number;
  completedCount: number;
  variationCount: number;
}

/**
 * 入径率（纯函数）：入径人数/应入径人数×100。
 *
 * @param records 路径记录列表
 * @returns 入径率百分比
 */
export function computeEnrollmentRateV13(records: PathwayRecordV13[]): number {
  const eligible = records.reduce((acc, r) => acc + r.eligibleCount, 0);
  const enrolled = records.reduce((acc, r) => acc + r.enrolledCount, 0);
  if (eligible === 0) return 0;
  return Math.round((enrolled / eligible) * 100);
}

/**
 * 完成率（纯函数）：完成人数/入径人数×100。
 *
 * @param records 路径记录列表
 * @returns 完成率百分比
 */
export function computeCompletionRateV13(records: PathwayRecordV13[]): number {
  const enrolled = records.reduce((acc, r) => acc + r.enrolledCount, 0);
  const completed = records.reduce((acc, r) => acc + r.completedCount, 0);
  if (enrolled === 0) return 0;
  return Math.round((completed / enrolled) * 100);
}

/**
 * 变异率（纯函数）：变异人数/入径人数×100，保留 1 位小数。
 *
 * @param records 路径记录列表
 * @returns 变异率百分比
 */
export function computeVariationRateV13(records: PathwayRecordV13[]): number {
  const enrolled = records.reduce((acc, r) => acc + r.enrolledCount, 0);
  const variation = records.reduce((acc, r) => acc + r.variationCount, 0);
  if (enrolled === 0) return 0;
  return Math.round((variation / enrolled) * 1000) / 10;
}
