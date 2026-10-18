/**
 * 健澜科技 jlmedaios - 质控培训记录 V14 聚合器（M503-D，M503 收官）
 *
 * 纯函数：培训记录构建 + 培训记录聚合。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 培训记录 */
export interface TrainingRecordV14 {
  user: string;
  course: string;
  date: string;
}

/** 聚合结果 */
export interface TrainingRecordAggregateV14 {
  total: number;
  users: number;
}

/**
 * 构建培训记录。
 *
 * @param user 参训人
 * @param course 课程
 * @param date 培训日期
 * @returns 培训记录
 */
export function buildTrainingRecord(user: string, course: string, date: string): TrainingRecordV14 {
  return { user, course, date };
}

/**
 * 聚合培训记录（总记录数 + 参训人数）。
 *
 * @param records 培训记录数组
 * @returns 聚合结果
 */
export function aggregateTrainingRecord(records: TrainingRecordV14[]): TrainingRecordAggregateV14 {
  // 手算 total：记录数 = 数组长度
  if (records.length === 0) {
    return { total: 0, users: 0 };
  }
  // 手算 users：去重后的 user 数（Set 去重）
  const uniqueUsers = new Set(records.map((r) => r.user));
  return { total: records.length, users: uniqueUsers.size };
}
