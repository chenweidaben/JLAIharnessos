/**
 * 健澜科技 jlmedaios - 学术交流 V13 纯函数（M361-D，M361 收官）
 *
 * computeAcademicConferenceCountV13 / computePublishedPaperCountV13 / computeAcademicPositionCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 学术交流记录 */
export interface AcademicExchangeRecordV13 {
  conferenceCount: number;
  paperCount: number;
  academicPositionCount: number;
}

/**
 * 主办学术会议次数（纯函数）：求和。
 *
 * @param records 学术交流记录列表
 * @returns 主办学术会议次数
 */
export function computeAcademicConferenceCountV13(records: AcademicExchangeRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.conferenceCount, 0);
}

/**
 * 发表论文数（纯函数）：求和。
 *
 * @param records 学术交流记录列表
 * @returns 发表论文数
 */
export function computePublishedPaperCountV13(records: AcademicExchangeRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.paperCount, 0);
}

/**
 * 学术任职人数（纯函数）：求和。
 *
 * @param records 学术交流记录列表
 * @returns 学术任职人数
 */
export function computeAcademicPositionCountV13(records: AcademicExchangeRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.academicPositionCount, 0);
}
