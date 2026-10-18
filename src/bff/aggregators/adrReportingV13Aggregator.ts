/**
 * 健澜科技 jlmedaios - 药品不良反应监测 V13 纯函数（M440-C，药事管理与药学服务组）
 *
 * computeAdrReportingCountV13 / computeAdrReportingSeriousRateV13 / computeAdrReportingDisposalTimelinessRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 药品不良反应监测记录 */
export interface AdrReportingRecordV13 {
  seriousAdr: number;
  totalAdr: number;
  timelyDisposal: number;
}

/**
 * ADR 上报例数（纯函数，计数指标）：直接返回 records.length。
 *
 * @param records 药品不良反应监测记录列表
 * @returns ADR 上报例数（整数）
 */
export function computeAdrReportingCountV13(records: AdrReportingRecordV13[]): number {
  return records.length;
}

/**
 * 严重 ADR 占比（纯函数）：严重 ADR 例数/ADR 上报总例数×100，保留 2 位小数。
 *
 * @param records 药品不良反应监测记录列表
 * @returns 严重 ADR 占比百分比
 */
export function computeAdrReportingSeriousRateV13(records: AdrReportingRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalAdr, 0);
  if (total === 0) return 0;
  const serious = records.reduce((acc, r) => acc + r.seriousAdr, 0);
  return Math.round((serious / total) * 10000) / 100;
}

/**
 * ADR 处置及时率（纯函数）：及时处置 ADR 例数/ADR 总例数×100，保留 2 位小数。
 *
 * @param records 药品不良反应监测记录列表
 * @returns ADR 处置及时率百分比
 */
export function computeAdrReportingDisposalTimelinessRateV13(records: AdrReportingRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalAdr, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timelyDisposal, 0);
  return Math.round((timely / total) * 10000) / 100;
}
