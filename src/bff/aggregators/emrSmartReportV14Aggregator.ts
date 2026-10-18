/**
 * 健澜科技 jlmedaios - 病历质控智能报表 V14 聚合器（M470-D，M470 收官）
 *
 * 纯函数：生成智能报表（通过率/缺陷率）+ 提取关键发现。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 报表输入 */
export interface SmartReportInputV14 {
  period: string;
  totalRecords: number;
  passCount: number;
  defectCount: number;
}

/** 智能报表 */
export interface SmartReportV14 {
  period: string;
  totalRecords: number;
  passCount: number;
  defectCount: number;
  passRate: number;
  defectRate: number;
  generatedAt: string;
}

/**
 * 生成智能报表：passRate=passCount/total×100（整数）；defectRate=defectCount/total×100（整数）。
 *
 * @param data 报表输入
 * @returns 智能报表
 */
export function buildSmartReport(data: SmartReportInputV14): SmartReportV14 {
  const total = data.totalRecords;
  const passRate = total > 0 ? Math.round((data.passCount / total) * 100) : 0;
  const defectRate = total > 0 ? Math.round((data.defectCount / total) * 100) : 0;
  return {
    period: data.period,
    totalRecords: data.totalRecords,
    passCount: data.passCount,
    defectCount: data.defectCount,
    passRate,
    defectRate,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * 提取关键发现：
 * passRate>90 → "质控情况良好"
 * passRate 80-90 → "需关注通过率"
 * passRate<80 → "需重点整改"
 * defectRate>10 → "缺陷率偏高"
 *
 * @param report 智能报表
 * @returns 关键发现列表
 */
export function extractKeyFindings(report: SmartReportV14): string[] {
  const findings: string[] = [];
  if (report.passRate > 90) {
    findings.push("质控情况良好");
  } else if (report.passRate >= 80) {
    findings.push("需关注通过率");
  } else {
    findings.push("需重点整改");
  }
  if (report.defectRate > 10) {
    findings.push("缺陷率偏高");
  }
  return findings;
}
