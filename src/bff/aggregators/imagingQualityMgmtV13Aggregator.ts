/**
 * 健澜科技 jlmedaios - 影像质量管理 V13 纯函数（M430-A，-quality 后缀避让旧版 medicalImagingDetailV13（M415））
 *
 * computeImagingReportPassRateV13 / computeImagingDiagnosisMatchRateV13 / computeImagingExaminationPositiveRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 影像质量管理记录 */
export interface ImagingQualityMgmtRecordV13 {
  reportPass: number;
  reportTotal: number;
  diagnosisMatch: number;
  comparisonTotal: number;
  positiveExam: number;
  examTotal: number;
}

/**
 * 影像报告合格率（纯函数）：合格报告数/报告总数×100，保留 2 位小数。
 *
 * @param records 影像质量管理记录列表
 * @returns 影像报告合格率百分比
 */
export function computeImagingReportPassRateV13(records: ImagingQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.reportTotal, 0);
  if (total === 0) return 0;
  const pass = records.reduce((acc, r) => acc + r.reportPass, 0);
  return Math.round((pass / total) * 10000) / 100;
}

/**
 * 影像诊断符合率（纯函数）：符合诊断数/对照总数×100，保留 2 位小数。
 *
 * @param records 影像质量管理记录列表
 * @returns 影像诊断符合率百分比
 */
export function computeImagingDiagnosisMatchRateV13(records: ImagingQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.comparisonTotal, 0);
  if (total === 0) return 0;
  const match = records.reduce((acc, r) => acc + r.diagnosisMatch, 0);
  return Math.round((match / total) * 10000) / 100;
}

/**
 * 影像检查阳性率（纯函数）：阳性检查数/检查总数×100，保留 2 位小数。
 *
 * @param records 影像质量管理记录列表
 * @returns 影像检查阳性率百分比
 */
export function computeImagingExaminationPositiveRateV13(records: ImagingQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.examTotal, 0);
  if (total === 0) return 0;
  const positive = records.reduce((acc, r) => acc + r.positiveExam, 0);
  return Math.round((positive / total) * 10000) / 100;
}
