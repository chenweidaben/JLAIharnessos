/**
 * 健澜科技 jlmedaios - 教学活动 V13 纯函数（M383-B）
 *
 * computeTeachingRoundCountV13 / computeMiniLectureCountV13 / computeCaseDiscussionCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 教学活动记录 */
export interface TeachingActivityRecordV13 {
  teachingRoundCount: number;
  miniLectureCount: number;
  caseDiscussionCount: number;
}

/**
 * 教学查房次数（纯函数）：求和。
 *
 * @param records 教学活动记录列表
 * @returns 教学查房次数
 */
export function computeTeachingRoundCountV13(records: TeachingActivityRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.teachingRoundCount, 0);
}

/**
 * 小讲课次数（纯函数）：求和。
 *
 * @param records 教学活动记录列表
 * @returns 小讲课次数
 */
export function computeMiniLectureCountV13(records: TeachingActivityRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.miniLectureCount, 0);
}

/**
 * 病例讨论次数（纯函数）：求和。
 *
 * @param records 教学活动记录列表
 * @returns 病例讨论次数
 */
export function computeCaseDiscussionCountV13(records: TeachingActivityRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.caseDiscussionCount, 0);
}
