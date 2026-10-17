/**
 * 健澜科技 jlmedaios - 不良事件管理（细节）V13 纯函数（M413-D，M413 收官，detail 避让旧版 adverseEventReportV13）
 *
 * computeAdverseEventReportRateV13 / computeRootCauseAnalysisCompletionRateV13 / computeRectificationMeasureImplementationRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 不良事件管理（细节）记录 */
export interface AdverseEventDetailRecordV13 {
  reported: number;
  shouldTotal: number;
  rootCauseDone: number;
  eventTotal: number;
  rectified: number;
  shouldRectifyTotal: number;
}

/**
 * 不良事件上报率（纯函数）：已上报数/应上报总数×100，保留 2 位小数。
 *
 * @param records 不良事件管理（细节）记录列表
 * @returns 不良事件上报率百分比
 */
export function computeAdverseEventReportRateV13(records: AdverseEventDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldTotal, 0);
  if (total === 0) return 0;
  const reported = records.reduce((acc, r) => acc + r.reported, 0);
  return Math.round((reported / total) * 10000) / 100;
}

/**
 * 根因分析完成率（纯函数）：已完成根因分析数/不良事件总数×100，保留 2 位小数。
 *
 * @param records 不良事件管理（细节）记录列表
 * @returns 根因分析完成率百分比
 */
export function computeRootCauseAnalysisCompletionRateV13(records: AdverseEventDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.eventTotal, 0);
  if (total === 0) return 0;
  const rootCauseDone = records.reduce((acc, r) => acc + r.rootCauseDone, 0);
  return Math.round((rootCauseDone / total) * 10000) / 100;
}

/**
 * 整改措施落实率（纯函数）：已落实整改数/应整改总数×100，保留 2 位小数。
 *
 * @param records 不良事件管理（细节）记录列表
 * @returns 整改措施落实率百分比
 */
export function computeRectificationMeasureImplementationRateV13(records: AdverseEventDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldRectifyTotal, 0);
  if (total === 0) return 0;
  const rectified = records.reduce((acc, r) => acc + r.rectified, 0);
  return Math.round((rectified / total) * 10000) / 100;
}
