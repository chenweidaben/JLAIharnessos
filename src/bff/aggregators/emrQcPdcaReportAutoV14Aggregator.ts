/**
 * 健澜科技 jlmedaios - 质控PDCA报告自动生成 V14 聚合器（M518-D，M518 收官，避让 -auto）
 *
 * 纯函数：构建PDCA报告基础数据 + 生成PDCA改进指标 + 构建PDCA摘要。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** PDCA报告基础数据 */
export interface PdcaReportAutoV14 {
  projectName: string;
  dept: string;
  phase: string;
}

/** PDCA改进指标输入 */
export interface PdcaMetricsAutoV14 {
  beforeScore: number;
  afterScore: number;
}

/** PDCA生成结果 */
export interface PdcaReportAutoResultV14 {
  improvement: number;
  improvementRate: number;
}

/** PDCA摘要 */
export interface PdcaReportAutoSummaryV14 {
  status: string;
}

/**
 * 构建PDCA报告基础数据。
 *
 * @param projectName 项目名称
 * @param dept 科室
 * @param phase 当前阶段
 * @returns PDCA报告基础数据
 */
export function buildPdcaReportAuto(projectName: string, dept: string, phase: string): PdcaReportAutoV14 {
  return { projectName, dept, phase };
}

/**
 * 生成PDCA改进指标。
 * improvement=afterScore-beforeScore；improvementRate=improvement/beforeScore×100，保留 1 位小数，beforeScore=0 时返回 0。
 *
 * @param report PDCA报告基础数据
 * @param metrics 改进指标输入
 * @returns PDCA生成结果（improvement + improvementRate）
 */
export function generatePdcaReportAuto(
  report: PdcaReportAutoV14,
  metrics: PdcaMetricsAutoV14,
): PdcaReportAutoResultV14 {
  // 手算：improvement = afterScore - beforeScore
  const improvement = metrics.afterScore - metrics.beforeScore;
  // 手算：improvementRate = improvement / beforeScore × 100，保留 1 位小数；beforeScore=0 时返回 0
  let improvementRate = 0;
  if (metrics.beforeScore !== 0) {
    improvementRate = Math.round((improvement / metrics.beforeScore) * 1000) / 10;
  }
  // 避免未使用变量警告
  void report;
  return { improvement, improvementRate };
}

/**
 * 构建PDCA摘要。
 * improvementRate>=20→'显著改进'，>=10→'持续改进'，>=0→'基本达标'，否则'需重新计划'。
 *
 * @param result PDCA生成结果（只需 improvementRate）
 * @returns PDCA摘要（status）
 */
export function buildPdcaReportAutoSummary(result: { improvementRate: number; improvement?: number }): PdcaReportAutoSummaryV14 {
  // 手算：improvementRate>=20→显著改进，>=10→持续改进，>=0→基本达标，否则需重新计划
  let status = "需重新计划";
  if (result.improvementRate >= 20) {
    status = "显著改进";
  } else if (result.improvementRate >= 10) {
    status = "持续改进";
  } else if (result.improvementRate >= 0) {
    status = "基本达标";
  }
  return { status };
}
