/**
 * 健澜科技 jlmedaios - 绩效改进质量管理 V13 纯函数（M433-D，M433 收官，-quality 后缀避让旧版 performanceImprovementMgmtV13（M410））
 *
 * computePerformanceImprovementProjectCountV13 / computePerformanceImprovementCompletionRateV13 / computePerformanceImprovementBenefitRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 绩效改进质量管理记录 */
export interface PerformanceImprovementQualityMgmtRecordV13 {
  projectCount: number;
  completedProjects: number;
  initiatedProjects: number;
  benefitProjects: number;
}

/**
 * 绩效改进项目数（纯函数，整数求和类，单位个）：对 projectCount 求和。
 *
 * @param records 绩效改进质量管理记录列表
 * @returns 绩效改进项目数（整数个）
 */
export function computePerformanceImprovementProjectCountV13(records: PerformanceImprovementQualityMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.projectCount, 0);
}

/**
 * 绩效改进完成率（纯函数）：已完成项目数/立项项目总数×100，保留 2 位小数。
 *
 * @param records 绩效改进质量管理记录列表
 * @returns 绩效改进完成率百分比
 */
export function computePerformanceImprovementCompletionRateV13(records: PerformanceImprovementQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.initiatedProjects, 0);
  if (total === 0) return 0;
  const completed = records.reduce((acc, r) => acc + r.completedProjects, 0);
  return Math.round((completed / total) * 10000) / 100;
}

/**
 * 绩效改进效益率（纯函数）：产生效益项目数/已完成项目数×100，保留 2 位小数。
 *
 * @param records 绩效改进质量管理记录列表
 * @returns 绩效改进效益率百分比
 */
export function computePerformanceImprovementBenefitRateV13(records: PerformanceImprovementQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.completedProjects, 0);
  if (total === 0) return 0;
  const benefit = records.reduce((acc, r) => acc + r.benefitProjects, 0);
  return Math.round((benefit / total) * 10000) / 100;
}
