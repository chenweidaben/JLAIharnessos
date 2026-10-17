/**
 * 健澜科技 jlmedaios - 编码质量 V13 纯函数（M401-D，M401 收官）
 *
 * computeICD10AccuracyRateV13 / computeICD9CM3AccuracyRateV13 / computeCodingDefectRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 编码质量记录 */
export interface CodingQualityRecordV13 {
  icd10Accurate: number;
  icd10Total: number;
  icd9Accurate: number;
  icd9Total: number;
  defectCount: number;
  totalCoding: number;
}

/**
 * ICD-10 编码准确率（纯函数）：准确数/编码总数×100，保留 2 位小数。
 *
 * @param records 编码质量记录列表
 * @returns ICD-10 编码准确率百分比
 */
export function computeICD10AccuracyRateV13(records: CodingQualityRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.icd10Total, 0);
  if (total === 0) return 0;
  const accurate = records.reduce((acc, r) => acc + r.icd10Accurate, 0);
  return Math.round((accurate / total) * 10000) / 100;
}

/**
 * ICD-9-CM-3 编码准确率（纯函数）：准确数/编码总数×100，保留 2 位小数。
 *
 * @param records 编码质量记录列表
 * @returns ICD-9-CM-3 编码准确率百分比
 */
export function computeICD9CM3AccuracyRateV13(records: CodingQualityRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.icd9Total, 0);
  if (total === 0) return 0;
  const accurate = records.reduce((acc, r) => acc + r.icd9Accurate, 0);
  return Math.round((accurate / total) * 10000) / 100;
}

/**
 * 编码缺陷率（纯函数）：缺陷数/编码总数×100，保留 2 位小数。
 *
 * @param records 编码质量记录列表
 * @returns 编码缺陷率百分比
 */
export function computeCodingDefectRateV13(records: CodingQualityRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCoding, 0);
  if (total === 0) return 0;
  const defect = records.reduce((acc, r) => acc + r.defectCount, 0);
  return Math.round((defect / total) * 10000) / 100;
}
