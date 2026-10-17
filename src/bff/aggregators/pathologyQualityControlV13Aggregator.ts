/**
 * 健澜科技 jlmedaios - 病理质控 V13 纯函数（M392-C）
 *
 * computePathologyReportTimelyRateV13 / computePathologyDiagnosisConcordanceRateV13 / computeSpecimenQualificationRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 病理质控记录 */
export interface PathologyQualityControlRecordV13 {
  timelyCount: number;
  reportTotalCount: number;
  concordanceCount: number;
  diagnosisTotalCount: number;
  qualifiedCount: number;
  specimenTotalCount: number;
}

/**
 * 病理报告及时率（纯函数）：及时报告数/报告总数×100，保留 2 位小数。
 *
 * @param records 病理质控记录列表
 * @returns 病理报告及时率百分比
 */
export function computePathologyReportTimelyRateV13(records: PathologyQualityControlRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.reportTotalCount, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timelyCount, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 病理诊断符合率（纯函数）：符合例数/诊断总数×100，保留 2 位小数。
 *
 * @param records 病理质控记录列表
 * @returns 病理诊断符合率百分比
 */
export function computePathologyDiagnosisConcordanceRateV13(records: PathologyQualityControlRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.diagnosisTotalCount, 0);
  if (total === 0) return 0;
  const concordance = records.reduce((acc, r) => acc + r.concordanceCount, 0);
  return Math.round((concordance / total) * 10000) / 100;
}

/**
 * 标本合格率（纯函数）：合格标本数/标本总数×100，保留 2 位小数。
 *
 * @param records 病理质控记录列表
 * @returns 标本合格率百分比
 */
export function computeSpecimenQualificationRateV13(records: PathologyQualityControlRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.specimenTotalCount, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualifiedCount, 0);
  return Math.round((qualified / total) * 10000) / 100;
}
