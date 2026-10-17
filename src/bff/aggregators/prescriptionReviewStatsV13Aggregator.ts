/**
 * 健澜科技 jlmedaios - 处方点评统计 V13 纯函数（M388-A，stats 避让）
 *
 * computePrescriptionReviewCountV13 / computeIrrationalPrescriptionRateV13 / computeSpecialPrescriptionReviewCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 处方点评统计记录 */
export interface PrescriptionReviewRecordV13 {
  reviewCount: number;
  irrationalCount: number;
  specialReviewCount: number;
}

/**
 * 处方点评数（纯函数）：求和。
 *
 * @param records 处方点评统计记录列表
 * @returns 处方点评数
 */
export function computePrescriptionReviewCountV13(records: PrescriptionReviewRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.reviewCount, 0);
}

/**
 * 不合理处方率（纯函数）：不合理处方数/点评处方数×100，保留 2 位小数。
 *
 * @param records 处方点评统计记录列表
 * @returns 不合理处方率百分比
 */
export function computeIrrationalPrescriptionRateV13(records: PrescriptionReviewRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.reviewCount, 0);
  if (total === 0) return 0;
  const irrational = records.reduce((acc, r) => acc + r.irrationalCount, 0);
  return Math.round((irrational / total) * 10000) / 100;
}

/**
 * 专项处方点评数（纯函数）：求和。
 *
 * @param records 处方点评统计记录列表
 * @returns 专项处方点评数
 */
export function computeSpecialPrescriptionReviewCountV13(records: PrescriptionReviewRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.specialReviewCount, 0);
}
