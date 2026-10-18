/**
 * 健澜科技 jlmedaios - 科室 KPI 质量管理 V13 纯函数（M433-A，-quality 后缀避让旧版 deptKpiMgmtV13（M410））
 *
 * computeDeptKpiCompletionRateV13 / computeDeptKpiAchievementRateV13 / computeDeptKpiImprovementRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 科室 KPI 质量管理记录 */
export interface DeptKpiQualityMgmtRecordV13 {
  completedItems: number;
  shouldCompleteItems: number;
  achievedItems: number;
  assessedItems: number;
  improvedItems: number;
  baselineItems: number;
}

/**
 * 科室 KPI 完成率（纯函数）：已完成 KPI 项数/应完成 KPI 项总数×100，保留 2 位小数。
 *
 * @param records 科室 KPI 质量管理记录列表
 * @returns 科室 KPI 完成率百分比
 */
export function computeDeptKpiCompletionRateV13(records: DeptKpiQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldCompleteItems, 0);
  if (total === 0) return 0;
  const completed = records.reduce((acc, r) => acc + r.completedItems, 0);
  return Math.round((completed / total) * 10000) / 100;
}

/**
 * 科室 KPI 达标率（纯函数）：达标 KPI 项数/考核 KPI 项总数×100，保留 2 位小数。
 *
 * @param records 科室 KPI 质量管理记录列表
 * @returns 科室 KPI 达标率百分比
 */
export function computeDeptKpiAchievementRateV13(records: DeptKpiQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.assessedItems, 0);
  if (total === 0) return 0;
  const achieved = records.reduce((acc, r) => acc + r.achievedItems, 0);
  return Math.round((achieved / total) * 10000) / 100;
}

/**
 * 科室 KPI 改进率（纯函数）：改进 KPI 项数/基线 KPI 项总数×100，保留 2 位小数。
 *
 * @param records 科室 KPI 质量管理记录列表
 * @returns 科室 KPI 改进率百分比
 */
export function computeDeptKpiImprovementRateV13(records: DeptKpiQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.baselineItems, 0);
  if (total === 0) return 0;
  const improved = records.reduce((acc, r) => acc + r.improvedItems, 0);
  return Math.round((improved / total) * 10000) / 100;
}
