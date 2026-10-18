/**
 * 健澜科技 jlmedaios - 员工培训发展管理 V13 纯函数（M444-D，M444 收官，绩效薪酬与人力资源管理组）
 *
 * computeStaffTrainingDevelopmentPlanCompletionRateV13 / computeStaffTrainingDevelopmentExamPassRateV13 / computeStaffTrainingDevelopmentPromotionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 员工培训发展管理记录 */
export interface StaffTrainingDevelopmentMgmtRecordV13 {
  completedTraining: number;
  plannedTraining: number;
  examPassed: number;
  examReferenced: number;
  promoted: number;
  eligible: number;
}

/**
 * 培训计划完成率（纯函数）：已完成培训次数/培训计划次数×100，保留 2 位小数。
 *
 * @param records 员工培训发展管理记录列表
 * @returns 培训计划完成率百分比
 */
export function computeStaffTrainingDevelopmentPlanCompletionRateV13(records: StaffTrainingDevelopmentMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.plannedTraining, 0);
  if (total === 0) return 0;
  const completed = records.reduce((acc, r) => acc + r.completedTraining, 0);
  return Math.round((completed / total) * 10000) / 100;
}

/**
 * 培训考核合格率（纯函数）：考核合格人数/考核参考人数×100，保留 2 位小数。
 *
 * @param records 员工培训发展管理记录列表
 * @returns 培训考核合格率百分比
 */
export function computeStaffTrainingDevelopmentExamPassRateV13(records: StaffTrainingDevelopmentMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.examReferenced, 0);
  if (total === 0) return 0;
  const passed = records.reduce((acc, r) => acc + r.examPassed, 0);
  return Math.round((passed / total) * 10000) / 100;
}

/**
 * 职称晋升率（纯函数）：已晋升职称人数/符合晋升条件人数×100，保留 2 位小数。
 *
 * @param records 员工培训发展管理记录列表
 * @returns 职称晋升率百分比
 */
export function computeStaffTrainingDevelopmentPromotionRateV13(records: StaffTrainingDevelopmentMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.eligible, 0);
  if (total === 0) return 0;
  const promotedCount = records.reduce((acc, r) => acc + r.promoted, 0);
  return Math.round((promotedCount / total) * 10000) / 100;
}
