/**
 * 健澜科技 jlmedaios - 病案质量管理 V13 纯函数（M354-B）
 *
 * computeGradeARateV13 / compute7DayFilingRateV13 / computeDRGEnrollmentRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 病案质量管理记录 */
export interface MedicalRecordQualityRecordV13 {
  gradeACount: number;
  sampledCount: number;
  filedWithin7DaysCount: number;
  dischargedCount: number;
  drgEnrolledCount: number;
  totalCaseCount: number;
}

/**
 * 甲级病案率（纯函数）：甲级数/抽查数×100，保留 2 位小数。
 *
 * @param records 病案质量管理记录列表
 * @returns 甲级病案率百分比
 */
export function computeGradeARateV13(records: MedicalRecordQualityRecordV13[]): number {
  const gradeA = records.reduce((acc, r) => acc + r.gradeACount, 0);
  const sampled = records.reduce((acc, r) => acc + r.sampledCount, 0);
  if (sampled === 0) return 0;
  return Math.round((gradeA / sampled) * 10000) / 100;
}

/**
 * 7 日归档率（纯函数）：7 日内归档数/出院数×100，保留 2 位小数。
 *
 * @param records 病案质量管理记录列表
 * @returns 7 日归档率百分比
 */
export function compute7DayFilingRateV13(records: MedicalRecordQualityRecordV13[]): number {
  const filed = records.reduce((acc, r) => acc + r.filedWithin7DaysCount, 0);
  const discharged = records.reduce((acc, r) => acc + r.dischargedCount, 0);
  if (discharged === 0) return 0;
  return Math.round((filed / discharged) * 10000) / 100;
}

/**
 * DRG 入组率（纯函数）：入组数/病例数×100，保留 2 位小数。
 *
 * @param records 病案质量管理记录列表
 * @returns DRG 入组率百分比
 */
export function computeDRGEnrollmentRateV13(records: MedicalRecordQualityRecordV13[]): number {
  const enrolled = records.reduce((acc, r) => acc + r.drgEnrolledCount, 0);
  const total = records.reduce((acc, r) => acc + r.totalCaseCount, 0);
  if (total === 0) return 0;
  return Math.round((enrolled / total) * 10000) / 100;
}
