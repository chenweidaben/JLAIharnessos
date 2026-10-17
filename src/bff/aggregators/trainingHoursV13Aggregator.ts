/**
 * 健澜科技 jlmedaios - 培训时长 V13 纯函数（M330-D）
 *
 * computeAvgTrainingHoursV13 / computeNewHireTrainingRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 培训记录 */
export interface TrainingRecordV13 {
  trainingHours: number;
  isNewHire: boolean;
  completedOnboarding: boolean;
}

/**
 * 人均培训学时（纯函数）：均值。
 *
 * @param records 培训记录列表
 * @returns 人均学时
 */
export function computeAvgTrainingHoursV13(records: TrainingRecordV13[]): number {
  if (records.length === 0) return 0;
  const total = records.reduce((acc, r) => acc + r.trainingHours, 0);
  return Math.round(total / records.length);
}

/**
 * 新员工岗前培训完成率（纯函数）：完成数/新员工总数×100。
 *
 * @param records 培训记录列表
 * @returns 完成率百分比
 */
export function computeNewHireTrainingRateV13(records: TrainingRecordV13[]): number {
  const newHires = records.filter((r) => r.isNewHire);
  if (newHires.length === 0) return 0;
  const completed = newHires.filter((r) => r.completedOnboarding).length;
  return Math.round((completed / newHires.length) * 100);
}
