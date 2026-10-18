/**
 * 健澜科技 jlmedaios - 统计管理 V13 纯函数（M450-D，M450 收官，宣传与党建管理组）
 *
 * computeStatisticsReportTimelinessRateV13 / computeStatisticsDataAccuracyRateV13 / computeStatisticsAnalysisReportCompletionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 统计管理记录 */
export interface StatisticsMgmtRecordV13 {
  timely: number;
  shouldReport: number;
  accurate: number;
  totalItems: number;
  completed: number;
  totalReport: number;
}

/**
 * 统计报表及时率（纯函数）：及时上报报表数/应上报报表总数×100，保留 2 位小数。
 *
 * @param records 统计管理记录列表
 * @returns 统计报表及时率百分比
 */
export function computeStatisticsReportTimelinessRateV13(records: StatisticsMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldReport, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timely, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 统计数据准确率（纯函数）：准确数据项数/数据项总数×100，保留 2 位小数。
 *
 * @param records 统计管理记录列表
 * @returns 统计数据准确率百分比
 */
export function computeStatisticsDataAccuracyRateV13(records: StatisticsMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalItems, 0);
  if (total === 0) return 0;
  const accurate = records.reduce((acc, r) => acc + r.accurate, 0);
  return Math.round((accurate / total) * 10000) / 100;
}

/**
 * 统计分析报告完成率（纯函数）：已完成分析报告数/应完成分析报告总数×100，保留 2 位小数。
 *
 * @param records 统计管理记录列表
 * @returns 统计分析报告完成率百分比
 */
export function computeStatisticsAnalysisReportCompletionRateV13(records: StatisticsMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalReport, 0);
  if (total === 0) return 0;
  const completed = records.reduce((acc, r) => acc + r.completed, 0);
  return Math.round((completed / total) * 10000) / 100;
}
