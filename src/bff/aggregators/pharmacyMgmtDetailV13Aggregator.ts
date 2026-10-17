/**
 * 健澜科技 jlmedaios - 药事管理（细节）V13 纯函数（M418-A，detail 避让旧版 prescriptionReview/drugCatalog/drugDelivery/drugSafety）
 *
 * computePrescriptionReviewPassRateV13 / computeDrugSupplyTimelyRateV13 / computeDrugRecallComplianceRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 药事管理（细节）记录 */
export interface PharmacyMgmtDetailRecordV13 {
  reviewQualified: number;
  reviewTotal: number;
  supplyTimely: number;
  supplyTotal: number;
  recallCompliant: number;
  recallTotal: number;
}

/**
 * 处方点评合格率（纯函数）：合格处方数/点评处方总数×100，保留 2 位小数。
 *
 * @param records 药事管理（细节）记录列表
 * @returns 处方点评合格率百分比
 */
export function computePrescriptionReviewPassRateV13(records: PharmacyMgmtDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.reviewTotal, 0);
  if (total === 0) return 0;
  const reviewQualified = records.reduce((acc, r) => acc + r.reviewQualified, 0);
  return Math.round((reviewQualified / total) * 10000) / 100;
}

/**
 * 药品供应及时率（纯函数）：及时供应品种数/应供应品种总数×100，保留 2 位小数。
 *
 * @param records 药事管理（细节）记录列表
 * @returns 药品供应及时率百分比
 */
export function computeDrugSupplyTimelyRateV13(records: PharmacyMgmtDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.supplyTotal, 0);
  if (total === 0) return 0;
  const supplyTimely = records.reduce((acc, r) => acc + r.supplyTimely, 0);
  return Math.round((supplyTimely / total) * 10000) / 100;
}

/**
 * 药品召回合规率（纯函数）：合规召回数/召回总数×100，保留 2 位小数。
 *
 * @param records 药事管理（细节）记录列表
 * @returns 药品召回合规率百分比
 */
export function computeDrugRecallComplianceRateV13(records: PharmacyMgmtDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.recallTotal, 0);
  if (total === 0) return 0;
  const recallCompliant = records.reduce((acc, r) => acc + r.recallCompliant, 0);
  return Math.round((recallCompliant / total) * 10000) / 100;
}
