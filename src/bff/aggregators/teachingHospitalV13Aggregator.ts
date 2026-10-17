/**
 * 健澜科技 jlmedaios - 教学医院指标 V13 纯函数（M327-B）
 *
 * countInternMentorsV13 / countTeachingHoursV13 / countTeachingRoundsV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 教学记录 */
export interface TeachingRecordV13 {
  teacherName: string;
  mentorCount: number;
  teachingHours: number;
  teachingRounds: number;
}

/**
 * 实习生带教人数（纯函数）：求和。
 *
 * @param records 教学记录列表
 * @returns 带教总人数
 */
export function countInternMentorsV13(records: TeachingRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.mentorCount, 0);
}

/**
 * 教学课时总数（纯函数）：求和，小时。
 *
 * @param records 教学记录列表
 * @returns 教学课时总数
 */
export function countTeachingHoursV13(records: TeachingRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.teachingHours, 0);
}

/**
 * 教学查房次数（纯函数）：求和。
 *
 * @param records 教学记录列表
 * @returns 教学查房总次数
 */
export function countTeachingRoundsV13(records: TeachingRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.teachingRounds, 0);
}
