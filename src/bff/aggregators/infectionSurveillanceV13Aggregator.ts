/**
 * 健澜科技 jlmedaios - 院感监测 V13 纯函数（M370-B）
 *
 * computeMdroDetectionRateV13 / computeSurgicalSiteInfectionRateV13 / computeIcuCatheterRelatedInfectionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 院感监测记录 */
export interface InfectionSurveillanceRecordV13 {
  mdroTested: number;
  mdroDetected: number;
  surgeryCount: number;
  ssiCount: number;
  catheterDays: number;
  catheterInfectionCount: number;
}

/**
 * 多重耐药菌检出率（纯函数）：检出数/检测数×100，保留 2 位小数。
 *
 * @param records 院感监测记录列表
 * @returns 多重耐药菌检出率百分比
 */
export function computeMdroDetectionRateV13(records: InfectionSurveillanceRecordV13[]): number {
  const tested = records.reduce((acc, r) => acc + r.mdroTested, 0);
  if (tested === 0) return 0;
  const detected = records.reduce((acc, r) => acc + r.mdroDetected, 0);
  return Math.round((detected / tested) * 10000) / 100;
}

/**
 * 手术部位感染率（纯函数）：感染数/手术数×100，保留 2 位小数。
 *
 * @param records 院感监测记录列表
 * @returns 手术部位感染率百分比
 */
export function computeSurgicalSiteInfectionRateV13(records: InfectionSurveillanceRecordV13[]): number {
  const surgery = records.reduce((acc, r) => acc + r.surgeryCount, 0);
  if (surgery === 0) return 0;
  const ssi = records.reduce((acc, r) => acc + r.ssiCount, 0);
  return Math.round((ssi / surgery) * 10000) / 100;
}

/**
 * ICU 导管相关感染率（纯函数）：感染数/导管使用日数×100，保留 2 位小数。
 *
 * @param records 院感监测记录列表
 * @returns ICU 导管相关感染率百分比
 */
export function computeIcuCatheterRelatedInfectionRateV13(records: InfectionSurveillanceRecordV13[]): number {
  const days = records.reduce((acc, r) => acc + r.catheterDays, 0);
  if (days === 0) return 0;
  const infection = records.reduce((acc, r) => acc + r.catheterInfectionCount, 0);
  return Math.round((infection / days) * 10000) / 100;
}
