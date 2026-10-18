/**
 * 健澜科技 jlmedaios - 科室质控月报自动生成 V14 聚合器（M518-A，避让 -dept）
 *
 * 纯函数：构建月报基础数据 + 生成月报统计 + 构建月报摘要。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 科室质控月报基础数据 */
export interface DeptMonthlyReportV14 {
  dept: string;
  month: string;
  totalRecords: number;
}

/** 月报缺陷统计 */
export interface DeptMonthlyDefectsV14 {
  block: number;
  major: number;
  minor: number;
}

/** 月报生成结果 */
export interface DeptMonthlyReportResultV14 {
  totalDefects: number;
  score: number;
}

/** 月报摘要 */
export interface DeptMonthlyReportSummaryV14 {
  score: number;
  grade: string;
}

/**
 * 构建科室质控月报基础数据。
 *
 * @param dept 科室
 * @param month 月份（YYYY-MM）
 * @param totalRecords 病历总数
 * @returns 月报基础数据
 */
export function buildDeptMonthlyReport(dept: string, month: string, totalRecords: number): DeptMonthlyReportV14 {
  return { dept, month, totalRecords };
}

/**
 * 生成月报统计。
 * totalDefects=block+major+minor；score=100-block×15-major×8-minor×3，clamp 0-100。
 *
 * @param report 月报基础数据
 * @param defects 缺陷统计
 * @returns 月报生成结果（totalDefects + score）
 */
export function generateDeptMonthlyReport(report: DeptMonthlyReportV14, defects: DeptMonthlyDefectsV14): DeptMonthlyReportResultV14 {
  // 手算：totalDefects = block + major + minor
  const totalDefects = defects.block + defects.major + defects.minor;
  // 手算：扣分 = block×15 + major×8 + minor×3；score = 100 - 扣分，clamp 0-100
  const deduction = defects.block * 15 + defects.major * 8 + defects.minor * 3;
  let score = 100 - deduction;
  if (score < 0) score = 0;
  if (score > 100) score = 100;
  return { totalDefects, score };
}

/**
 * 构建月报摘要。
 * score>=90→'优秀'，>=80→'良好'，>=70→'合格'，否则'不合格'。
 *
 * @param result 月报生成结果
 * @returns 月报摘要（score + grade）
 */
export function buildDeptMonthlyReportSummary(result: DeptMonthlyReportResultV14): DeptMonthlyReportSummaryV14 {
  // 手算：score>=90→优秀，>=80→良好，>=70→合格，否则不合格
  let grade = "不合格";
  if (result.score >= 90) {
    grade = "优秀";
  } else if (result.score >= 80) {
    grade = "良好";
  } else if (result.score >= 70) {
    grade = "合格";
  }
  return { score: result.score, grade };
}
