/**
 * 健澜科技 jlmedaios - 护理培训管理 V13 纯函数（M453-C，护理管理组）
 *
 * computeNursingTrainingPlanCompletionRateV13 / computeNursingThreeBaseExamQualifiedRateV13 / computeNursingSpecialistTrainingCoverageRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 护理培训管理记录 */
export interface NursingTrainingMgmtRecordV13 {
  completed: number;
  planned: number;
  qualified: number;
  totalExam: number;
  trained: number;
  totalShouldTrain: number;
}

/**
 * 护理培训计划完成率（纯函数）：已完成培训次数/培训计划次数×100，保留 2 位小数。
 *
 * @param records 护理培训管理记录列表
 * @returns 护理培训计划完成率百分比
 */
export function computeNursingTrainingPlanCompletionRateV13(records: NursingTrainingMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.planned, 0);
  if (total === 0) return 0;
  const completed = records.reduce((acc, r) => acc + r.completed, 0);
  return Math.round((completed / total) * 10000) / 100;
}

/**
 * 三基考核合格率（纯函数）：三基考核合格人数/三基考核总人数×100，保留 2 位小数。
 *
 * @param records 护理培训管理记录列表
 * @returns 三基考核合格率百分比
 */
export function computeNursingThreeBaseExamQualifiedRateV13(records: NursingTrainingMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalExam, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualified, 0);
  return Math.round((qualified / total) * 10000) / 100;
}

/**
 * 专科护士培训覆盖率（纯函数）：已培训专科护士数/应培训专科护士总数×100，保留 2 位小数。
 *
 * @param records 护理培训管理记录列表
 * @returns 专科护士培训覆盖率百分比
 */
export function computeNursingSpecialistTrainingCoverageRateV13(records: NursingTrainingMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalShouldTrain, 0);
  if (total === 0) return 0;
  const trained = records.reduce((acc, r) => acc + r.trained, 0);
  return Math.round((trained / total) * 10000) / 100;
}
