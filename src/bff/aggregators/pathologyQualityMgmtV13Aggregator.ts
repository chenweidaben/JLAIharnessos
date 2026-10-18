/**
 * 健澜科技 jlmedaios - 病理质量管理 V13 纯函数（M430-B，-quality 后缀避让旧版 pathologyMgmtV13（M415））
 *
 * computePathologyReportPassRateV13 / computePathologyDiagnosisMatchRateV13 / computePathologySpecimenPassRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 病理质量管理记录 */
export interface PathologyQualityMgmtRecordV13 {
  reportPass: number;
  reportTotal: number;
  diagnosisMatch: number;
  comparisonTotal: number;
  specimenPass: number;
  specimenTotal: number;
}

/**
 * 病理报告合格率（纯函数）：合格病理报告数/病理报告总数×100，保留 2 位小数。
 *
 * @param records 病理质量管理记录列表
 * @returns 病理报告合格率百分比
 */
export function computePathologyReportPassRateV13(records: PathologyQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.reportTotal, 0);
  if (total === 0) return 0;
  const pass = records.reduce((acc, r) => acc + r.reportPass, 0);
  return Math.round((pass / total) * 10000) / 100;
}

/**
 * 病理诊断符合率（纯函数）：符合诊断数/对照总数×100，保留 2 位小数。
 *
 * @param records 病理质量管理记录列表
 * @returns 病理诊断符合率百分比
 */
export function computePathologyDiagnosisMatchRateV13(records: PathologyQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.comparisonTotal, 0);
  if (total === 0) return 0;
  const match = records.reduce((acc, r) => acc + r.diagnosisMatch, 0);
  return Math.round((match / total) * 10000) / 100;
}

/**
 * 病理标本合格率（纯函数）：合格标本数/标本总数×100，保留 2 位小数。
 *
 * @param records 病理质量管理记录列表
 * @returns 病理标本合格率百分比
 */
export function computePathologySpecimenPassRateV13(records: PathologyQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.specimenTotal, 0);
  if (total === 0) return 0;
  const pass = records.reduce((acc, r) => acc + r.specimenPass, 0);
  return Math.round((pass / total) * 10000) / 100;
}
