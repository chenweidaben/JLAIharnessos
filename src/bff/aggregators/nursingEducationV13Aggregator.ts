/**
 * 健澜科技 jlmedaios - 护理教育 V13 纯函数（M389-C）
 *
 * computeNurseTrainingCompletionRateV13 / computeNursingRoundCountV13 / computeNursingExamPassRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 护理教育记录 */
export interface NursingEducationRecordV13 {
  completedCount: number;
  shouldTrainCount: number;
  roundCount: number;
  passedCount: number;
  examCount: number;
}

/**
 * 护士培训完成率（纯函数）：已完成培训人数/应培训人数×100，保留 2 位小数。
 *
 * @param records 护理教育记录列表
 * @returns 护士培训完成率百分比
 */
export function computeNurseTrainingCompletionRateV13(records: NursingEducationRecordV13[]): number {
  const should = records.reduce((acc, r) => acc + r.shouldTrainCount, 0);
  if (should === 0) return 0;
  const completed = records.reduce((acc, r) => acc + r.completedCount, 0);
  return Math.round((completed / should) * 10000) / 100;
}

/**
 * 护理查房次数（纯函数）：求和。
 *
 * @param records 护理教育记录列表
 * @returns 护理查房次数
 */
export function computeNursingRoundCountV13(records: NursingEducationRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.roundCount, 0);
}

/**
 * 护理考核合格率（纯函数）：合格人数/参考人数×100，保留 2 位小数。
 *
 * @param records 护理教育记录列表
 * @returns 护理考核合格率百分比
 */
export function computeNursingExamPassRateV13(records: NursingEducationRecordV13[]): number {
  const exam = records.reduce((acc, r) => acc + r.examCount, 0);
  if (exam === 0) return 0;
  const passed = records.reduce((acc, r) => acc + r.passedCount, 0);
  return Math.round((passed / exam) * 10000) / 100;
}
