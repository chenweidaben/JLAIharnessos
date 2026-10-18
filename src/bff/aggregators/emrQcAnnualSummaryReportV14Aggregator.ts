/**
 * 健澜科技 jlmedaios - 质控年度总结报告 V14 聚合器（M506-D，M506 收官）
 *
 * 纯函数：年度报告构建 + 年度报告聚合。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 年度总结报告 */
export interface AnnualReportV14 {
  year: number;
  totalRecords: number;
  passRate: number;
}

/** 聚合结果 */
export interface AnnualAggregateV14 {
  years: number;
  totalRecords: number;
  avgPassRate: number;
}

/**
 * 构建年度总结报告。
 *
 * @param year 年份
 * @param totalRecords 病历总数
 * @param passRate 合格率%
 * @returns 年度总结报告
 */
export function buildAnnualReport(year: number, totalRecords: number, passRate: number): AnnualReportV14 {
  return { year, totalRecords, passRate };
}

/**
 * 聚合年度报告（年数 + 总病历数 + 平均合格率%）。
 *
 * @param reports 年度报告数组
 * @returns 聚合结果
 */
export function aggregateAnnualReport(reports: AnnualReportV14[]): AnnualAggregateV14 {
  if (reports.length === 0) {
    return { years: 0, totalRecords: 0, avgPassRate: 0 };
  }
  // 手算聚合：years=length，totalRecords=sum，avgPassRate=Math.round(sum/years)
  const totalRecords = reports.reduce((acc, r) => acc + r.totalRecords, 0);
  const sumPassRate = reports.reduce((acc, r) => acc + r.passRate, 0);
  const avgPassRate = Math.round(sumPassRate / reports.length);
  return { years: reports.length, totalRecords, avgPassRate };
}
