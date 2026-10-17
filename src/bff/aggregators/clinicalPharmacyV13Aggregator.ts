/**
 * 健澜科技 jlmedaios - 临床药学 V13 纯函数（M380-B）
 *
 * computeClinicalPharmacistRoundCountV13 / computePrescriptionReviewCountV13 / computeMedicationOrderAuditCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 临床药学记录 */
export interface ClinicalPharmacyRecordV13 {
  pharmacistRoundCount: number;
  prescriptionReviewCount: number;
  medicationOrderAuditCount: number;
}

/**
 * 临床药师查房次数（纯函数）：求和。
 *
 * @param records 临床药学记录列表
 * @returns 临床药师查房次数
 */
export function computeClinicalPharmacistRoundCountV13(records: ClinicalPharmacyRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.pharmacistRoundCount, 0);
}

/**
 * 处方点评份数（纯函数）：求和。
 *
 * @param records 临床药学记录列表
 * @returns 处方点评份数
 */
export function computePrescriptionReviewCountV13(records: ClinicalPharmacyRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.prescriptionReviewCount, 0);
}

/**
 * 用药医嘱审核数（纯函数）：求和。
 *
 * @param records 临床药学记录列表
 * @returns 用药医嘱审核数
 */
export function computeMedicationOrderAuditCountV13(records: ClinicalPharmacyRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.medicationOrderAuditCount, 0);
}
