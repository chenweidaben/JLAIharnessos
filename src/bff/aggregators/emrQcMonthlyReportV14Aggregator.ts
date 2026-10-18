/**
 * 健澜科技 jlmedaios - 质控月度报表 V14 聚合器（M506-C）
 *
 * 纯函数：月度报表构建 + 月度报表聚合。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 月度报表 */
export interface MonthlyReportV14 {
  month: string;
  totalRecords: number;
  defects: number;
}

/** 聚合结果 */
export interface MonthlyAggregateV14 {
  months: number;
  totalRecords: number;
  totalDefects: number;
  defectRate: number;
}

/**
 * 构建月度报表。
 *
 * @param month 月份（YYYY-MM）
 * @param totalRecords 病历总数
 * @param defects 缺陷数
 * @returns 月度报表
 */
export function buildMonthlyReport(month: string, totalRecords: number, defects: number): MonthlyReportV14 {
  return { month, totalRecords, defects };
}

/**
 * 聚合月度报表（月数 + 总病历数 + 总缺陷数 + 缺陷率%）。
 *
 * @param reports 月度报表数组
 * @returns 聚合结果
 */
export function aggregateMonthlyReport(reports: MonthlyReportV14[]): MonthlyAggregateV14 {
  if (reports.length === 0) {
    return { months: 0, totalRecords: 0, totalDefects: 0, defectRate: 0 };
  }
  // 手算聚合：months=length，totalRecords=sum，totalDefects=sum，defectRate=Math.ceil(totalDefects/totalRecords×100)
  const totalRecords = reports.reduce((acc, r) => acc + r.totalRecords, 0);
  const totalDefects = reports.reduce((acc, r) => acc + r.defects, 0);
  const defectRate = totalRecords > 0 ? Math.ceil((totalDefects / totalRecords) * 100) : 0;
  return { months: reports.length, totalRecords, totalDefects, defectRate };
}
