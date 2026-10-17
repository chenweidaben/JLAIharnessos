/**
 * 健澜科技 jlmedaios - 传染病报告 V13 纯函数（M370-D，M370 收官）
 *
 * computeEpidemicReportTimelyRateV13 / computeEpidemicReportAccuracyRateV13 / computeEpidemicReportOmissionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 传染病报告记录 */
export interface EpidemicReportRecordV13 {
  reportTotal: number;
  timelyReport: number;
  accurateReport: number;
  shouldReport: number;
  omittedReport: number;
}

/**
 * 传染病报告及时率（纯函数）：及时报告数/报告总数×100，保留 2 位小数。
 *
 * @param records 传染病报告记录列表
 * @returns 传染病报告及时率百分比
 */
export function computeEpidemicReportTimelyRateV13(records: EpidemicReportRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.reportTotal, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timelyReport, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 报告准确率（纯函数）：准确数/报告总数×100，保留 2 位小数。
 *
 * @param records 传染病报告记录列表
 * @returns 报告准确率百分比
 */
export function computeEpidemicReportAccuracyRateV13(records: EpidemicReportRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.reportTotal, 0);
  if (total === 0) return 0;
  const accurate = records.reduce((acc, r) => acc + r.accurateReport, 0);
  return Math.round((accurate / total) * 10000) / 100;
}

/**
 * 漏报率（纯函数）：漏报数/应报告数×100，保留 2 位小数。
 *
 * @param records 传染病报告记录列表
 * @returns 漏报率百分比
 */
export function computeEpidemicReportOmissionRateV13(records: EpidemicReportRecordV13[]): number {
  const should = records.reduce((acc, r) => acc + r.shouldReport, 0);
  if (should === 0) return 0;
  const omitted = records.reduce((acc, r) => acc + r.omittedReport, 0);
  return Math.round((omitted / should) * 10000) / 100;
}
