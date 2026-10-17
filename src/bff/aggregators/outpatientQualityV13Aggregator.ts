/**
 * 健澜科技 jlmedaios - 门诊质量 V13 纯函数（M372-C）
 *
 * computeOutpatientDiagnosisConsistencyRateV13 / computeOutpatientPrescriptionPassRateV13 / computeOutpatientAverageLodgingDaysV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 门诊质量记录 */
export interface OutpatientQualityRecordV13 {
  diagnosisConsistencySample: number;
  diagnosisConsistencyPass: number;
  prescriptionCount: number;
  prescriptionPass: number;
  averageLodgingDays: number;
}

/**
 * 门诊诊断符合率（纯函数）：符合数/抽样数×100，保留 2 位小数。
 *
 * @param records 门诊质量记录列表
 * @returns 门诊诊断符合率百分比
 */
export function computeOutpatientDiagnosisConsistencyRateV13(records: OutpatientQualityRecordV13[]): number {
  const sample = records.reduce((acc, r) => acc + r.diagnosisConsistencySample, 0);
  if (sample === 0) return 0;
  const pass = records.reduce((acc, r) => acc + r.diagnosisConsistencyPass, 0);
  return Math.round((pass / sample) * 10000) / 100;
}

/**
 * 门诊处方合格率（纯函数）：合格数/处方数×100，保留 2 位小数。
 *
 * @param records 门诊质量记录列表
 * @returns 门诊处方合格率百分比
 */
export function computeOutpatientPrescriptionPassRateV13(records: OutpatientQualityRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.prescriptionCount, 0);
  if (total === 0) return 0;
  const pass = records.reduce((acc, r) => acc + r.prescriptionPass, 0);
  return Math.round((pass / total) * 10000) / 100;
}

/**
 * 门诊平均住院日（纯函数）：均值，保留 2 位小数。
 *
 * @param records 门诊质量记录列表
 * @returns 门诊平均住院日（天）
 */
export function computeOutpatientAverageLodgingDaysV13(records: OutpatientQualityRecordV13[]): number {
  if (records.length === 0) return 0;
  const total = records.reduce((acc, r) => acc + r.averageLodgingDays, 0);
  return Math.round((total / records.length) * 100) / 100;
}
