/**
 * 健澜科技 jlmedaios - AI 教学培训 V13 纯函数（M366-D，M366 收官）
 *
 * computeAiTeachingCourseCountV13 / computeAiTrainingParticipantCountV13 / computeAiExamPassRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 教学培训记录 */
export interface AiEducationRecordV13 {
  teachingCourseCount: number;
  trainingParticipantCount: number;
  examPassed: number;
  examTaken: number;
}

/**
 * AI 教学课程数（纯函数）：求和。
 *
 * @param records AI 教学培训记录列表
 * @returns AI 教学课程数
 */
export function computeAiTeachingCourseCountV13(records: AiEducationRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.teachingCourseCount, 0);
}

/**
 * AI 培训人次（纯函数）：求和。
 *
 * @param records AI 教学培训记录列表
 * @returns AI 培训人次
 */
export function computeAiTrainingParticipantCountV13(records: AiEducationRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.trainingParticipantCount, 0);
}

/**
 * AI 考核通过率（纯函数）：合格数/参考数×100，保留 2 位小数。
 *
 * @param records AI 教学培训记录列表
 * @returns AI 考核通过率百分比
 */
export function computeAiExamPassRateV13(records: AiEducationRecordV13[]): number {
  const taken = records.reduce((acc, r) => acc + r.examTaken, 0);
  if (taken === 0) return 0;
  const passed = records.reduce((acc, r) => acc + r.examPassed, 0);
  return Math.round((passed / taken) * 10000) / 100;
}
