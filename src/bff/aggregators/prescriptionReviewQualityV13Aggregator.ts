/**
 * 健澜科技 jlmedaios - 处方点评质量管理 V13 纯函数（M440-A，药事管理与药学服务组）
 *
 * computePrescriptionReviewRateV13 / computePrescriptionReviewRationalRateV13 / computePrescriptionReviewInterventionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 处方点评质量管理记录 */
export interface PrescriptionReviewQualityRecordV13 {
  reviewedPrescription: number;
  sampledPrescription: number;
  rationalPrescription: number;
  reviewedTotal: number;
  intervenedUnqualified: number;
  totalUnqualified: number;
}

/**
 * 处方点评率（纯函数）：已点评处方数/抽查处方总数×100，保留 2 位小数。
 *
 * @param records 处方点评质量管理记录列表
 * @returns 处方点评率百分比
 */
export function computePrescriptionReviewRateV13(records: PrescriptionReviewQualityRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.sampledPrescription, 0);
  if (total === 0) return 0;
  const reviewed = records.reduce((acc, r) => acc + r.reviewedPrescription, 0);
  return Math.round((reviewed / total) * 10000) / 100;
}

/**
 * 合理处方率（纯函数）：合理处方数/点评处方总数×100，保留 2 位小数。
 *
 * @param records 处方点评质量管理记录列表
 * @returns 合理处方率百分比
 */
export function computePrescriptionReviewRationalRateV13(records: PrescriptionReviewQualityRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.reviewedTotal, 0);
  if (total === 0) return 0;
  const rational = records.reduce((acc, r) => acc + r.rationalPrescription, 0);
  return Math.round((rational / total) * 10000) / 100;
}

/**
 * 不合格处方干预率（纯函数）：已干预不合格处方数/不合格处方总数×100，保留 2 位小数。
 *
 * @param records 处方点评质量管理记录列表
 * @returns 不合格处方干预率百分比
 */
export function computePrescriptionReviewInterventionRateV13(records: PrescriptionReviewQualityRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalUnqualified, 0);
  if (total === 0) return 0;
  const intervened = records.reduce((acc, r) => acc + r.intervenedUnqualified, 0);
  return Math.round((intervened / total) * 10000) / 100;
}
