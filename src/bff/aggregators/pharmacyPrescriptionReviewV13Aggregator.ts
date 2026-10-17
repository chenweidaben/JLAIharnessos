/**
 * 健澜科技 jlmedaios - 处方点评 V13 纯函数（M406-A）
 *
 * computePrescriptionReviewPassRateV13 / computeUnreasonablePrescriptionRateV13 / computeInappropriateMedicationPrescriptionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 处方点评记录 */
export interface PharmacyPrescriptionReviewRecordV13 {
  reviewPass: number;
  reviewTotal: number;
  unreasonable: number;
  inappropriate: number;
}

/**
 * 处方点评合格率（纯函数）：合格处方数/点评处方总数×100，保留 2 位小数。
 *
 * @param records 处方点评记录列表
 * @returns 处方点评合格率百分比
 */
export function computePrescriptionReviewPassRateV13(records: PharmacyPrescriptionReviewRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.reviewTotal, 0);
  if (total === 0) return 0;
  const passed = records.reduce((acc, r) => acc + r.reviewPass, 0);
  return Math.round((passed / total) * 10000) / 100;
}

/**
 * 不合理处方率（纯函数）：不合理处方数/点评处方总数×100，保留 2 位小数。
 *
 * @param records 处方点评记录列表
 * @returns 不合理处方率百分比
 */
export function computeUnreasonablePrescriptionRateV13(records: PharmacyPrescriptionReviewRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.reviewTotal, 0);
  if (total === 0) return 0;
  const unreasonable = records.reduce((acc, r) => acc + r.unreasonable, 0);
  return Math.round((unreasonable / total) * 10000) / 100;
}

/**
 * 用药不适宜处方率（纯函数）：不适宜处方数/点评处方总数×100，保留 2 位小数。
 *
 * @param records 处方点评记录列表
 * @returns 用药不适宜处方率百分比
 */
export function computeInappropriateMedicationPrescriptionRateV13(records: PharmacyPrescriptionReviewRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.reviewTotal, 0);
  if (total === 0) return 0;
  const inappropriate = records.reduce((acc, r) => acc + r.inappropriate, 0);
  return Math.round((inappropriate / total) * 10000) / 100;
}
