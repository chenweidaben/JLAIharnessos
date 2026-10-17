/**
 * 健澜科技 jlmedaios - 影像质量 V13 纯函数（M360-B，新规格）
 *
 * computeImagingReportTimelyRateV13 / computeImagingPositiveRateV13 / computeGradeAFilmRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 影像质量记录 */
export interface ImagingQualityRecordV13 {
  reportTimely: number;
  reportCount: number;
  positiveCount: number;
  examCount: number;
  gradeAFilm: number;
  totalFilm: number;
}

/**
 * 影像报告及时率（纯函数）：及时数/报告数×100，保留 2 位小数。
 *
 * @param records 影像质量记录列表
 * @returns 影像报告及时率百分比
 */
export function computeImagingReportTimelyRateV13(records: ImagingQualityRecordV13[]): number {
  const timely = records.reduce((acc, r) => acc + r.reportTimely, 0);
  const total = records.reduce((acc, r) => acc + r.reportCount, 0);
  if (total === 0) return 0;
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 检查阳性率（纯函数）：阳性数/检查数×100，保留 2 位小数。
 *
 * @param records 影像质量记录列表
 * @returns 检查阳性率百分比
 */
export function computeImagingPositiveRateV13(records: ImagingQualityRecordV13[]): number {
  const positive = records.reduce((acc, r) => acc + r.positiveCount, 0);
  const total = records.reduce((acc, r) => acc + r.examCount, 0);
  if (total === 0) return 0;
  return Math.round((positive / total) * 10000) / 100;
}

/**
 * 甲级片率（纯函数）：甲级片数/片总数×100，保留 2 位小数。
 *
 * @param records 影像质量记录列表
 * @returns 甲级片率百分比
 */
export function computeGradeAFilmRateV13(records: ImagingQualityRecordV13[]): number {
  const gradeA = records.reduce((acc, r) => acc + r.gradeAFilm, 0);
  const total = records.reduce((acc, r) => acc + r.totalFilm, 0);
  if (total === 0) return 0;
  return Math.round((gradeA / total) * 10000) / 100;
}
