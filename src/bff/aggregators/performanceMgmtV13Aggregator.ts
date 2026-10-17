/**
 * 健澜科技 jlmedaios - 绩效管理 V13 纯函数（M395-D，M395 收官）
 *
 * computeDeptPerformanceEvaluationCompletionRateV13 / computeDRGPerformanceIndicatorAchievementRateV13 / computePatientSatisfactionIndicatorV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 绩效管理记录 */
export interface PerformanceMgmtRecordV13 {
  completedDeptCount: number;
  totalDeptCount: number;
  achievedCount: number;
  drgTotalCount: number;
  satisfactionScore: number;
}

/**
 * 科室绩效考核完成率（纯函数）：已完成考核科室数/科室总数×100，保留 2 位小数。
 *
 * @param records 绩效管理记录列表
 * @returns 科室绩效考核完成率百分比
 */
export function computeDeptPerformanceEvaluationCompletionRateV13(records: PerformanceMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalDeptCount, 0);
  if (total === 0) return 0;
  const completed = records.reduce((acc, r) => acc + r.completedDeptCount, 0);
  return Math.round((completed / total) * 10000) / 100;
}

/**
 * DRG绩效指标达成率（纯函数）：已达成指标数/DRG指标总数×100，保留 2 位小数。
 *
 * @param records 绩效管理记录列表
 * @returns DRG绩效指标达成率百分比
 */
export function computeDRGPerformanceIndicatorAchievementRateV13(records: PerformanceMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.drgTotalCount, 0);
  if (total === 0) return 0;
  const achieved = records.reduce((acc, r) => acc + r.achievedCount, 0);
  return Math.round((achieved / total) * 10000) / 100;
}

/**
 * 患者满意度指标（纯函数）：患者满意度平均分，保留 2 位小数。
 *
 * @param records 绩效管理记录列表
 * @returns 患者满意度平均分
 */
export function computePatientSatisfactionIndicatorV13(records: PerformanceMgmtRecordV13[]): number {
  if (records.length === 0) return 0;
  const avg = records.reduce((acc, r) => acc + r.satisfactionScore, 0) / records.length;
  return Math.round(avg * 100) / 100;
}
