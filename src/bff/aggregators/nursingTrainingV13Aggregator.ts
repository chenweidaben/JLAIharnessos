/**
 * 健澜科技 jlmedaios - 护理培训 V13 纯函数（M369-D，M369 收官）
 *
 * computeNursingTrainingCountV13 / computeNursingTrainingParticipantCountV13 / computeNursingTrainingPassRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 护理培训记录 */
export interface NursingTrainingRecordV13 {
  trainingCount: number;
  participantCount: number;
  examTake: number;
  examPass: number;
}

/**
 * 培训次数（纯函数）：求和。
 *
 * @param records 护理培训记录列表
 * @returns 培训次数
 */
export function computeNursingTrainingCountV13(records: NursingTrainingRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.trainingCount, 0);
}

/**
 * 培训人次（纯函数）：求和。
 *
 * @param records 护理培训记录列表
 * @returns 培训人次
 */
export function computeNursingTrainingParticipantCountV13(records: NursingTrainingRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.participantCount, 0);
}

/**
 * 考核合格率（纯函数）：合格数/参考数×100，保留 2 位小数。
 *
 * @param records 护理培训记录列表
 * @returns 考核合格率百分比
 */
export function computeNursingTrainingPassRateV13(records: NursingTrainingRecordV13[]): number {
  const take = records.reduce((acc, r) => acc + r.examTake, 0);
  if (take === 0) return 0;
  const pass = records.reduce((acc, r) => acc + r.examPass, 0);
  return Math.round((pass / take) * 10000) / 100;
}
