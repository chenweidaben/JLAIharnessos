/**
 * 健澜科技 jlmedaios - 影像质控 V13 纯函数（M392-B）
 *
 * computeImageGradeARateV13 / computeImagingDiagnosisConcordanceRateV13 / computeImagingReportTimelyRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 影像质控记录 */
export interface ImagingQualityControlRecordV13 {
  gradeACount: number;
  totalCount: number;
  concordanceCount: number;
  diagnosisTotalCount: number;
  timelyCount: number;
  reportTotalCount: number;
}

/**
 * 影像甲级片率（纯函数）：甲级片数/片总数×100，保留 2 位小数。
 *
 * @param records 影像质控记录列表
 * @returns 影像甲级片率百分比
 */
export function computeImageGradeARateV13(records: ImagingQualityControlRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCount, 0);
  if (total === 0) return 0;
  const gradeA = records.reduce((acc, r) => acc + r.gradeACount, 0);
  return Math.round((gradeA / total) * 10000) / 100;
}

/**
 * 影像诊断符合率（纯函数）：符合例数/诊断总数×100，保留 2 位小数。
 *
 * @param records 影像质控记录列表
 * @returns 影像诊断符合率百分比
 */
export function computeImagingDiagnosisConcordanceRateV13(records: ImagingQualityControlRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.diagnosisTotalCount, 0);
  if (total === 0) return 0;
  const concordance = records.reduce((acc, r) => acc + r.concordanceCount, 0);
  return Math.round((concordance / total) * 10000) / 100;
}

/**
 * 影像报告及时率（纯函数）：及时报告数/报告总数×100，保留 2 位小数。
 *
 * @param records 影像质控记录列表
 * @returns 影像报告及时率百分比
 */
export function computeImagingReportTimelyRateV13(records: ImagingQualityControlRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.reportTotalCount, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timelyCount, 0);
  return Math.round((timely / total) * 10000) / 100;
}
