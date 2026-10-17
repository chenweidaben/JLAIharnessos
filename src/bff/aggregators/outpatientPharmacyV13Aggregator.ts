/**
 * 健澜科技 jlmedaios - 门诊药房 V13 纯函数（M390-C）
 *
 * computeOutpatientPrescriptionDispenseCountV13 / computePrescriptionDispenseTimeAvgV13 / computeOutpatientMedicationConsultationCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 门诊药房记录 */
export interface OutpatientPharmacyRecordV13 {
  dispenseCount: number;
  totalDispenseMinutes: number;
  consultationCount: number;
}

/**
 * 门诊处方调配数（纯函数）：求和。
 *
 * @param records 门诊药房记录列表
 * @returns 门诊处方调配数
 */
export function computeOutpatientPrescriptionDispenseCountV13(records: OutpatientPharmacyRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.dispenseCount, 0);
}

/**
 * 处方调配时长（纯函数）：总调配时长/调配总数，保留 2 位小数，分钟。
 *
 * @param records 门诊药房记录列表
 * @returns 平均处方调配时长（分钟）
 */
export function computePrescriptionDispenseTimeAvgV13(records: OutpatientPharmacyRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.dispenseCount, 0);
  if (total === 0) return 0;
  const minutes = records.reduce((acc, r) => acc + r.totalDispenseMinutes, 0);
  return Math.round((minutes / total) * 100) / 100;
}

/**
 * 门诊用药咨询数（纯函数）：求和。
 *
 * @param records 门诊药房记录列表
 * @returns 门诊用药咨询数
 */
export function computeOutpatientMedicationConsultationCountV13(records: OutpatientPharmacyRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.consultationCount, 0);
}
