/**
 * 健澜科技 jlmedaios - 医院运营效率 V13 纯函数（M322-D）
 *
 * computeOutpatientWaitTimeV13 / computeInpatientTurnoverDaysV13 / computeReportTimelinessRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 门诊等候记录 */
export interface OutpatientWaitV13 {
  recordId: string;
  waitMinutes: number;
}

/** 住院停留记录 */
export interface InpatientStayV13 {
  recordId: string;
  stayDays: number;
}

/** 检查报告 */
export interface ReportItemV13 {
  reportId: string;
  isTimely: boolean;
}

/**
 * 门诊次均等候时间（纯函数）：均值，分钟。
 *
 * @param data 门诊等候记录列表
 * @returns 平均等候分钟数（四舍五入）
 */
export function computeOutpatientWaitTimeV13(data: OutpatientWaitV13[]): number {
  if (data.length === 0) return 0;
  const sum = data.reduce((acc, d) => acc + d.waitMinutes, 0);
  return Math.round(sum / data.length);
}

/**
 * 住院平均周转天数（纯函数）：均值，天。
 *
 * @param data 住院停留记录列表
 * @returns 平均周转天数（四舍五入）
 */
export function computeInpatientTurnoverDaysV13(data: InpatientStayV13[]): number {
  if (data.length === 0) return 0;
  const sum = data.reduce((acc, d) => acc + d.stayDays, 0);
  return Math.round(sum / data.length);
}

/**
 * 检查报告及时率（纯函数）：及时报告数/总报告数×100。
 *
 * @param reports 检查报告列表
 * @returns 及时率百分比
 */
export function computeReportTimelinessRateV13(reports: ReportItemV13[]): number {
  if (reports.length === 0) return 0;
  const timely = reports.filter((r) => r.isTimely).length;
  return Math.round((timely / reports.length) * 100);
}
