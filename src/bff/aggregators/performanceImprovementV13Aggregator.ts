/**
 * 健澜科技 jlmedaios - 绩效改进 V13 纯函数（M410-D，M410 收官）
 *
 * computePerformanceAppealHandleRateV13 / computePerformanceImprovementPlanCompletionRateV13 / computePerformanceTrainingCoverageRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 绩效改进记录 */
export interface PerformanceImprovementRecordV13 {
  handled: number;
  appealTotal: number;
  completed: number;
  planTotal: number;
  trained: number;
  shouldTrain: number;
}

/**
 * 绩效申诉处理率（纯函数）：已处理申诉数/申诉总数×100，保留 2 位小数。
 *
 * @param records 绩效改进记录列表
 * @returns 绩效申诉处理率百分比
 */
export function computePerformanceAppealHandleRateV13(records: PerformanceImprovementRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.appealTotal, 0);
  if (total === 0) return 0;
  const handled = records.reduce((acc, r) => acc + r.handled, 0);
  return Math.round((handled / total) * 10000) / 100;
}

/**
 * 绩效改进计划完成率（纯函数）：已完成计划数/计划总数×100，保留 2 位小数。
 *
 * @param records 绩效改进记录列表
 * @returns 绩效改进计划完成率百分比
 */
export function computePerformanceImprovementPlanCompletionRateV13(records: PerformanceImprovementRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.planTotal, 0);
  if (total === 0) return 0;
  const completed = records.reduce((acc, r) => acc + r.completed, 0);
  return Math.round((completed / total) * 10000) / 100;
}

/**
 * 绩效培训覆盖率（纯函数）：已培训人数/应培训人数×100，保留 2 位小数。
 *
 * @param records 绩效改进记录列表
 * @returns 绩效培训覆盖率百分比
 */
export function computePerformanceTrainingCoverageRateV13(records: PerformanceImprovementRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldTrain, 0);
  if (total === 0) return 0;
  const trained = records.reduce((acc, r) => acc + r.trained, 0);
  return Math.round((trained / total) * 10000) / 100;
}
