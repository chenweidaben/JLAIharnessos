/**
 * 健澜科技 jlmedaios - 药品不良反应 V13 纯函数（M336-B）
 *
 * computeADRTotalCountV13 / computeSeriousADRRateV13 / computeTimelyReportRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 药品不良反应记录 */
export interface ADRRecordV13 {
  totalCount: number;
  seriousCount: number;
  timelyReportedCount: number;
}

/**
 * ADR 总数（纯函数）：总数。
 *
 * @param records ADR 记录列表
 * @returns ADR 总数
 */
export function computeADRTotalCountV13(records: ADRRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.totalCount, 0);
}

/**
 * 严重 ADR 占比（纯函数）：严重数/总数×100。
 *
 * @param records ADR 记录列表
 * @returns 严重 ADR 占比百分比
 */
export function computeSeriousADRRateV13(records: ADRRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCount, 0);
  const serious = records.reduce((acc, r) => acc + r.seriousCount, 0);
  if (total === 0) return 0;
  return Math.round((serious / total) * 100);
}

/**
 * 上报及时率（纯函数）：及时数/总数×100。
 *
 * @param records ADR 记录列表
 * @returns 上报及时率百分比
 */
export function computeTimelyReportRateV13(records: ADRRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCount, 0);
  const timely = records.reduce((acc, r) => acc + r.timelyReportedCount, 0);
  if (total === 0) return 0;
  return Math.round((timely / total) * 100);
}
