/**
 * 健澜科技 jlmedaios - 培训管理 V13 纯函数（M362-B）
 *
 * computePreJobTrainingCompletionRateV13 / computeAnnualTrainingHoursV13 / computeTrainingExamPassRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 培训管理记录 */
export interface TrainingMgmtRecordV13 {
  completedPreJob: number;
  requiredPreJob: number;
  annualHours: number;
  examPassed: number;
  examAttended: number;
}

/**
 * 岗前培训完成率（纯函数）：完成人数/应培训人数×100，保留 2 位小数。
 *
 * @param records 培训管理记录列表
 * @returns 岗前培训完成率百分比
 */
export function computePreJobTrainingCompletionRateV13(records: TrainingMgmtRecordV13[]): number {
  const completed = records.reduce((acc, r) => acc + r.completedPreJob, 0);
  const required = records.reduce((acc, r) => acc + r.requiredPreJob, 0);
  if (required === 0) return 0;
  return Math.round((completed / required) * 10000) / 100;
}

/**
 * 年度培训学时（纯函数）：求和。
 *
 * @param records 培训管理记录列表
 * @returns 年度培训学时
 */
export function computeAnnualTrainingHoursV13(records: TrainingMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.annualHours, 0);
}

/**
 * 培训考核合格率（纯函数）：合格数/参考数×100，保留 2 位小数。
 *
 * @param records 培训管理记录列表
 * @returns 培训考核合格率百分比
 */
export function computeTrainingExamPassRateV13(records: TrainingMgmtRecordV13[]): number {
  const passed = records.reduce((acc, r) => acc + r.examPassed, 0);
  const attended = records.reduce((acc, r) => acc + r.examAttended, 0);
  if (attended === 0) return 0;
  return Math.round((passed / attended) * 10000) / 100;
}
