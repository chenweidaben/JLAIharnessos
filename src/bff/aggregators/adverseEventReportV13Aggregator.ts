/**
 * 健澜科技 jlmedaios - 不良事件上报 V13 纯函数（M387-D，M387 收官）
 *
 * computeAdverseEventReportCountV13 / computeReportTimelinessRateV13 / computeRootCauseAnalysisCompletionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 不良事件上报记录 */
export interface AdverseEventReportRecordV13 {
  reportCount: number;
  timelyCount: number;
  totalCount: number;
  completedRcaCount: number;
  shouldRcaCount: number;
}

/**
 * 不良事件上报数（纯函数）：求和。
 *
 * @param records 不良事件上报记录列表
 * @returns 不良事件上报数
 */
export function computeAdverseEventReportCountV13(records: AdverseEventReportRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.reportCount, 0);
}

/**
 * 上报及时率（纯函数）：及时上报数/上报总数×100，保留 2 位小数。
 *
 * @param records 不良事件上报记录列表
 * @returns 上报及时率百分比
 */
export function computeReportTimelinessRateV13(records: AdverseEventReportRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCount, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timelyCount, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 根本原因分析完成率（纯函数）：已完成 RCA 数/应完成数×100，保留 2 位小数。
 *
 * @param records 不良事件上报记录列表
 * @returns 根本原因分析完成率百分比
 */
export function computeRootCauseAnalysisCompletionRateV13(records: AdverseEventReportRecordV13[]): number {
  const should = records.reduce((acc, r) => acc + r.shouldRcaCount, 0);
  if (should === 0) return 0;
  const completed = records.reduce((acc, r) => acc + r.completedRcaCount, 0);
  return Math.round((completed / should) * 10000) / 100;
}
