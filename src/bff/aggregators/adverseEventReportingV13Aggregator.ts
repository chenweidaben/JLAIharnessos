/**
 * 健澜科技 jlmedaios - 不良事件上报管理 V13 纯函数（M439-A，患者安全与医疗风险管理组）
 *
 * computeAdverseEventReportingCountV13 / computeAdverseEventReportingTimelinessRateV13 / computeAdverseEventReportingRcaCompletionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 不良事件上报管理记录 */
export interface AdverseEventReportingRecordV13 {
  timelyReported: number;
  totalReported: number;
  completedRca: number;
  shouldRca: number;
}

/**
 * 上报例数（纯函数，计数指标）：直接返回 records.length。
 *
 * @param records 不良事件上报管理记录列表
 * @returns 上报例数（整数）
 */
export function computeAdverseEventReportingCountV13(records: AdverseEventReportingRecordV13[]): number {
  return records.length;
}

/**
 * 上报及时率（纯函数）：24h 内上报例数/上报总例数×100，保留 2 位小数。
 *
 * @param records 不良事件上报管理记录列表
 * @returns 上报及时率百分比
 */
export function computeAdverseEventReportingTimelinessRateV13(records: AdverseEventReportingRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalReported, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timelyReported, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 根因分析完成率（纯函数）：已完成 RCA 例数/应做 RCA 例数×100，保留 2 位小数。
 *
 * @param records 不良事件上报管理记录列表
 * @returns 根因分析完成率百分比
 */
export function computeAdverseEventReportingRcaCompletionRateV13(records: AdverseEventReportingRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldRca, 0);
  if (total === 0) return 0;
  const completed = records.reduce((acc, r) => acc + r.completedRca, 0);
  return Math.round((completed / total) * 10000) / 100;
}
