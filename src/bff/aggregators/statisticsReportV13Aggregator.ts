/**
 * 健澜科技 jlmedaios - 统计报表 V13 纯函数（M401-C）
 *
 * computeStatutoryReportTimelyRateV13 / computeStatisticalDataAccuracyRateV13 / computeStatisticalAnalysisReportCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 统计报表记录 */
export interface StatisticsReportRecordV13 {
  timelyReported: number;
  totalReported: number;
  accurate: number;
  totalChecked: number;
  reportCount: number;
}

/**
 * 法定报表上报及时率（纯函数）：及时上报数/应上报总数×100，保留 2 位小数。
 *
 * @param records 统计报表记录列表
 * @returns 法定报表上报及时率百分比
 */
export function computeStatutoryReportTimelyRateV13(records: StatisticsReportRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalReported, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timelyReported, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 统计数据准确率（纯函数）：准确数/校验总数×100，保留 2 位小数。
 *
 * @param records 统计报表记录列表
 * @returns 统计数据准确率百分比
 */
export function computeStatisticalDataAccuracyRateV13(records: StatisticsReportRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalChecked, 0);
  if (total === 0) return 0;
  const accurate = records.reduce((acc, r) => acc + r.accurate, 0);
  return Math.round((accurate / total) * 10000) / 100;
}

/**
 * 统计分析报告数（纯函数）：求和。
 *
 * @param records 统计报表记录列表
 * @returns 统计分析报告数
 */
export function computeStatisticalAnalysisReportCountV13(records: StatisticsReportRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.reportCount, 0);
}
