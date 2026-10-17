/**
 * 健澜科技 jlmedaios - 学术交流统计 V13 纯函数（M383-D，stats 避让，M383 收官）
 *
 * computeAcademicConferenceCountV13 / computeOutgoingTrainingCountV13 / computeExpertVisitCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 学术交流统计记录 */
export interface AcademicExchangeRecordV13 {
  conferenceCount: number;
  outgoingTrainingCount: number;
  expertVisitCount: number;
}

/**
 * 学术会议举办次数（纯函数）：求和。
 *
 * @param records 学术交流统计记录列表
 * @returns 学术会议举办次数
 */
export function computeAcademicConferenceCountV13(records: AcademicExchangeRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.conferenceCount, 0);
}

/**
 * 外出进修人次（纯函数）：求和。
 *
 * @param records 学术交流统计记录列表
 * @returns 外出进修人次
 */
export function computeOutgoingTrainingCountV13(records: AcademicExchangeRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.outgoingTrainingCount, 0);
}

/**
 * 专家来院次数（纯函数）：求和。
 *
 * @param records 学术交流统计记录列表
 * @returns 专家来院次数
 */
export function computeExpertVisitCountV13(records: AcademicExchangeRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.expertVisitCount, 0);
}
