/**
 * 健澜科技 jlmedaios - 临床路径统计 V13 纯函数（M386-D，stats 避让，M386 收官）
 *
 * computeClinicalPathwayEnrollmentRateV13 / computeClinicalPathwayCompletionRateV13 / computeClinicalPathwayVariationRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 临床路径统计记录 */
export interface ClinicalPathwayRecordV13 {
  enrolledCount: number;
  totalEligibleCount: number;
  completedCount: number;
  variationCount: number;
}

/**
 * 临床路径入径率（纯函数）：入径病例数/应入径病例数×100，保留 2 位小数。
 *
 * @param records 临床路径统计记录列表
 * @returns 入径率百分比
 */
export function computeClinicalPathwayEnrollmentRateV13(records: ClinicalPathwayRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalEligibleCount, 0);
  if (total === 0) return 0;
  const enrolled = records.reduce((acc, r) => acc + r.enrolledCount, 0);
  return Math.round((enrolled / total) * 10000) / 100;
}

/**
 * 临床路径完成率（纯函数）：完成病例数/入径病例数×100，保留 2 位小数。
 *
 * @param records 临床路径统计记录列表
 * @returns 完成率百分比
 */
export function computeClinicalPathwayCompletionRateV13(records: ClinicalPathwayRecordV13[]): number {
  const enrolled = records.reduce((acc, r) => acc + r.enrolledCount, 0);
  if (enrolled === 0) return 0;
  const completed = records.reduce((acc, r) => acc + r.completedCount, 0);
  return Math.round((completed / enrolled) * 10000) / 100;
}

/**
 * 临床路径变异率（纯函数）：变异病例数/入径病例数×100，保留 2 位小数。
 *
 * @param records 临床路径统计记录列表
 * @returns 变异率百分比
 */
export function computeClinicalPathwayVariationRateV13(records: ClinicalPathwayRecordV13[]): number {
  const enrolled = records.reduce((acc, r) => acc + r.enrolledCount, 0);
  if (enrolled === 0) return 0;
  const variation = records.reduce((acc, r) => acc + r.variationCount, 0);
  return Math.round((variation / enrolled) * 10000) / 100;
}
