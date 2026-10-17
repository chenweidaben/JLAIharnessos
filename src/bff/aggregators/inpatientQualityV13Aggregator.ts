/**
 * 健澜科技 jlmedaios - 住院质量 V13 纯函数（M373-C）
 *
 * computeInpatientDiagnosisConsistencyRateV13 / computePrePostOpDiagnosisConsistencyRateV13 / computeCriticalRescueSuccessRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 住院质量记录 */
export interface InpatientQualityRecordV13 {
  diagnosisConsistencySample: number;
  diagnosisConsistencyPass: number;
  prePostOpSample: number;
  prePostOpPass: number;
  criticalRescueCount: number;
  criticalRescueSuccess: number;
}

/**
 * 住院诊断符合率（纯函数）：符合数/抽样数×100，保留 2 位小数。
 *
 * @param records 住院质量记录列表
 * @returns 住院诊断符合率百分比
 */
export function computeInpatientDiagnosisConsistencyRateV13(records: InpatientQualityRecordV13[]): number {
  const sample = records.reduce((acc, r) => acc + r.diagnosisConsistencySample, 0);
  if (sample === 0) return 0;
  const pass = records.reduce((acc, r) => acc + r.diagnosisConsistencyPass, 0);
  return Math.round((pass / sample) * 10000) / 100;
}

/**
 * 手术前后诊断符合率（纯函数）：符合数/手术数×100，保留 2 位小数。
 *
 * @param records 住院质量记录列表
 * @returns 手术前后诊断符合率百分比
 */
export function computePrePostOpDiagnosisConsistencyRateV13(records: InpatientQualityRecordV13[]): number {
  const sample = records.reduce((acc, r) => acc + r.prePostOpSample, 0);
  if (sample === 0) return 0;
  const pass = records.reduce((acc, r) => acc + r.prePostOpPass, 0);
  return Math.round((pass / sample) * 10000) / 100;
}

/**
 * 危重抢救成功率（纯函数）：成功数/抢救数×100，保留 2 位小数。
 *
 * @param records 住院质量记录列表
 * @returns 危重抢救成功率百分比
 */
export function computeCriticalRescueSuccessRateV13(records: InpatientQualityRecordV13[]): number {
  const rescue = records.reduce((acc, r) => acc + r.criticalRescueCount, 0);
  if (rescue === 0) return 0;
  const success = records.reduce((acc, r) => acc + r.criticalRescueSuccess, 0);
  return Math.round((success / rescue) * 10000) / 100;
}
