/**
 * 健澜科技 jlmedaios - 影像质量 V13 纯函数（M374-D，M374 收官）
 *
 * computeRadiologyGradeAFilmRateV13 / computeRadiologyDiagnosisConsistencyRateV13 / computeRadiologyReportTimelyRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 影像质量记录 */
export interface RadiologyQualityRecordV13 {
  totalFilmCount: number;
  gradeAFilmCount: number;
  diagnosisSample: number;
  diagnosisPass: number;
  totalReportCount: number;
  timelyReportCount: number;
}

/**
 * 影像甲级片率（纯函数）：甲级片数/片总数×100，保留 2 位小数。
 *
 * @param records 影像质量记录列表
 * @returns 影像甲级片率百分比
 */
export function computeRadiologyGradeAFilmRateV13(records: RadiologyQualityRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalFilmCount, 0);
  if (total === 0) return 0;
  const gradeA = records.reduce((acc, r) => acc + r.gradeAFilmCount, 0);
  return Math.round((gradeA / total) * 10000) / 100;
}

/**
 * 影像诊断符合率（纯函数）：符合数/抽样数×100，保留 2 位小数。
 *
 * @param records 影像质量记录列表
 * @returns 影像诊断符合率百分比
 */
export function computeRadiologyDiagnosisConsistencyRateV13(records: RadiologyQualityRecordV13[]): number {
  const sample = records.reduce((acc, r) => acc + r.diagnosisSample, 0);
  if (sample === 0) return 0;
  const pass = records.reduce((acc, r) => acc + r.diagnosisPass, 0);
  return Math.round((pass / sample) * 10000) / 100;
}

/**
 * 影像报告及时率（纯函数）：及时报告数/报告总数×100，保留 2 位小数。
 *
 * @param records 影像质量记录列表
 * @returns 影像报告及时率百分比
 */
export function computeRadiologyReportTimelyRateV13(records: RadiologyQualityRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalReportCount, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timelyReportCount, 0);
  return Math.round((timely / total) * 10000) / 100;
}
