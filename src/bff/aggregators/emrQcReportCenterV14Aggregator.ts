/**
 * 健澜科技 jlmedaios - 病历质控报表中心 V14 聚合器（M478-D，M478 收官）
 *
 * 纯函数：报表中心目录构建 + 报表生成。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 报表条目 */
export interface ReportItemV14 {
  id: string;
  name: string;
  category: string;
}

/** 报表中心目录 */
export interface ReportCenterV14 {
  reports: ReportItemV14[];
  total: number;
}

/** 生成的报表 */
export interface GeneratedReportV14 {
  reportId: string;
  dept: string;
  period: string;
  generatedAt: string;
}

/**
 * 构建报表中心目录。
 *
 * @param reports 报表列表
 * @returns 报表中心目录
 */
export function buildReportCenter(reports: ReportItemV14[]): ReportCenterV14 {
  return { reports: [...reports], total: reports.length };
}

/**
 * 生成指定报表。
 *
 * @param reportId 报表 ID
 * @param params 参数（dept/period）
 * @returns 生成的报表
 */
export function generateQcReport(
  reportId: string,
  params: { dept: string; period: string },
): GeneratedReportV14 {
  return {
    reportId,
    dept: params.dept,
    period: params.period,
    generatedAt: new Date().toISOString(),
  };
}
