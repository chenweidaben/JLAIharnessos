/**
 * 健澜科技 jlmedaios - 病历质控科室质量报告 V14 聚合器（M475-B）
 *
 * 纯函数：生成科室质量报告 + 改进建议汇总。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 科室质量报告 */
export interface DeptQcReportV14 {
  dept: string;
  totalRecords: number;
  passCount: number;
  defectCount: number;
  passRate: number;
}

/**
 * 生成科室质量报告，passRate=passCount/total×100（整数）。
 *
 * @param dept 科室名
 * @param data 基础数据
 * @returns 科室质量报告
 */
export function buildDeptReport(
  dept: string,
  data: { totalRecords: number; passCount: number; defectCount: number },
): DeptQcReportV14 {
  const passRate = data.totalRecords === 0 ? 0 : Math.round((data.passCount / data.totalRecords) * 100);
  return {
    dept,
    totalRecords: data.totalRecords,
    passCount: data.passCount,
    defectCount: data.defectCount,
    passRate,
  };
}

/**
 * 生成改进建议列表：passRate>95→"质控优秀"；85-95（含边界）→"持续改进"；<85→"需重点整改"。
 *
 * @param report 科室质量报告
 * @returns 改进建议列表
 */
export function summarizeDeptFindings(report: DeptQcReportV14): string[] {
  const findings: string[] = [];
  if (report.passRate > 95) {
    findings.push("质控优秀");
  } else if (report.passRate >= 85) {
    findings.push("持续改进");
  } else {
    findings.push("需重点整改");
  }
  if (report.defectCount > 0) {
    findings.push("存在缺陷需整改");
  }
  return findings;
}
