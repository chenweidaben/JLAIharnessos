/**
 * 健澜科技 jlmedaios - 医疗质量 V13 纯函数（M371-A）
 *
 * computeMedicalRecordGradeARateV13 / computeCureRateV13 / computeImprovementRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医疗质量记录 */
export interface MedicalQualityRecordV13 {
  totalRecords: number;
  gradeARecords: number;
  dischargeCount: number;
  curedCount: number;
  improvedCount: number;
}

/**
 * 病案甲级率（纯函数）：甲级病案数/病案总数×100，保留 2 位小数。
 *
 * @param records 医疗质量记录列表
 * @returns 病案甲级率百分比
 */
export function computeMedicalRecordGradeARateV13(records: MedicalQualityRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalRecords, 0);
  if (total === 0) return 0;
  const gradeA = records.reduce((acc, r) => acc + r.gradeARecords, 0);
  return Math.round((gradeA / total) * 10000) / 100;
}

/**
 * 治愈率（纯函数）：治愈人数/出院人数×100，保留 2 位小数。
 *
 * @param records 医疗质量记录列表
 * @returns 治愈率百分比
 */
export function computeCureRateV13(records: MedicalQualityRecordV13[]): number {
  const discharge = records.reduce((acc, r) => acc + r.dischargeCount, 0);
  if (discharge === 0) return 0;
  const cured = records.reduce((acc, r) => acc + r.curedCount, 0);
  return Math.round((cured / discharge) * 10000) / 100;
}

/**
 * 好转率（纯函数）：好转人数/出院人数×100，保留 2 位小数。
 *
 * @param records 医疗质量记录列表
 * @returns 好转率百分比
 */
export function computeImprovementRateV13(records: MedicalQualityRecordV13[]): number {
  const discharge = records.reduce((acc, r) => acc + r.dischargeCount, 0);
  if (discharge === 0) return 0;
  const improved = records.reduce((acc, r) => acc + r.improvedCount, 0);
  return Math.round((improved / discharge) * 10000) / 100;
}
