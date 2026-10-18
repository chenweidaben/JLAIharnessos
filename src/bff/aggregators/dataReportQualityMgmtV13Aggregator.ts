/**
 * 健澜科技 jlmedaios - 数据上报质量管理 V13 纯函数（M432-B，换名 dataReport + -quality 后缀避让旧版 dataQualityMgmtV13（M409））
 *
 * computeDataReportCompletenessRateV13 / computeDataReportAccuracyRateV13 / computeDataReportTimelinessRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 数据上报质量管理记录 */
export interface DataReportQualityMgmtRecordV13 {
  completeItems: number;
  shouldReportItems: number;
  accurateRecords: number;
  reportRecords: number;
  timelyReports: number;
  shouldReportTimes: number;
}

/**
 * 数据完整率（纯函数）：完整上报项数/应上报项总数×100，保留 2 位小数。
 *
 * @param records 数据上报质量管理记录列表
 * @returns 数据完整率百分比
 */
export function computeDataReportCompletenessRateV13(records: DataReportQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldReportItems, 0);
  if (total === 0) return 0;
  const complete = records.reduce((acc, r) => acc + r.completeItems, 0);
  return Math.round((complete / total) * 10000) / 100;
}

/**
 * 数据准确率（纯函数）：准确数据条数/上报数据总条数×100，保留 2 位小数。
 *
 * @param records 数据上报质量管理记录列表
 * @returns 数据准确率百分比
 */
export function computeDataReportAccuracyRateV13(records: DataReportQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.reportRecords, 0);
  if (total === 0) return 0;
  const accurate = records.reduce((acc, r) => acc + r.accurateRecords, 0);
  return Math.round((accurate / total) * 10000) / 100;
}

/**
 * 数据及时率（纯函数）：及时上报次数/应上报次数×100，保留 2 位小数。
 *
 * @param records 数据上报质量管理记录列表
 * @returns 数据及时率百分比
 */
export function computeDataReportTimelinessRateV13(records: DataReportQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldReportTimes, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timelyReports, 0);
  return Math.round((timely / total) * 10000) / 100;
}
