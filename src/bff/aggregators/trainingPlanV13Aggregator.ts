/**
 * 健澜科技 jlmedaios - 培训计划 V13 纯函数（M384-D，M384 收官）
 *
 * computeAnnualTrainingPlanCountV13 / computeTrainingCompletionRateV13 / computePerCapitaTrainingHoursV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 培训计划记录 */
export interface TrainingPlanRecordV13 {
  planCount: number;
  completedCount: number;
  plannedCount: number;
  totalHours: number;
  totalPeople: number;
}

/**
 * 年度培训计划数（纯函数）：求和。
 *
 * @param records 培训计划记录列表
 * @returns 年度培训计划数
 */
export function computeAnnualTrainingPlanCountV13(records: TrainingPlanRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.planCount, 0);
}

/**
 * 培训完成率（纯函数）：已完成培训数/计划培训数×100，保留 2 位小数。
 *
 * @param records 培训计划记录列表
 * @returns 培训完成率百分比
 */
export function computeTrainingCompletionRateV13(records: TrainingPlanRecordV13[]): number {
  const planned = records.reduce((acc, r) => acc + r.plannedCount, 0);
  if (planned === 0) return 0;
  const completed = records.reduce((acc, r) => acc + r.completedCount, 0);
  return Math.round((completed / planned) * 10000) / 100;
}

/**
 * 人均培训学时（纯函数）：总学时/总人数，保留 2 位小数。
 *
 * @param records 培训计划记录列表
 * @returns 人均培训学时
 */
export function computePerCapitaTrainingHoursV13(records: TrainingPlanRecordV13[]): number {
  const people = records.reduce((acc, r) => acc + r.totalPeople, 0);
  if (people === 0) return 0;
  const hours = records.reduce((acc, r) => acc + r.totalHours, 0);
  return Math.round((hours / people) * 100) / 100;
}
