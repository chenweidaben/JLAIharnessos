/**
 * 健澜科技 jlmedaios - 志愿服务 V13 纯函数（M378-C）
 *
 * computeVolunteerServiceCountV13 / computeVolunteerServiceHoursV13 / computeVolunteerServiceSatisfactionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 志愿服务记录 */
export interface VolunteerServiceRecordV13 {
  volunteerServiceCount: number;
  volunteerHours: number;
  satisfactionCount: number;
}

/**
 * 志愿服务人次（纯函数）：求和。
 *
 * @param records 志愿服务记录列表
 * @returns 志愿服务人次
 */
export function computeVolunteerServiceCountV13(records: VolunteerServiceRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.volunteerServiceCount, 0);
}

/**
 * 志愿服务总时长（纯函数）：求和，单位小时。
 *
 * @param records 志愿服务记录列表
 * @returns 志愿服务总时长
 */
export function computeVolunteerServiceHoursV13(records: VolunteerServiceRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.volunteerHours, 0);
}

/**
 * 服务满意度（纯函数）：满意数/服务数×100，保留 2 位小数。
 *
 * @param records 志愿服务记录列表
 * @returns 服务满意度百分比
 */
export function computeVolunteerServiceSatisfactionRateV13(records: VolunteerServiceRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.volunteerServiceCount, 0);
  if (total === 0) return 0;
  const satisfaction = records.reduce((acc, r) => acc + r.satisfactionCount, 0);
  return Math.round((satisfaction / total) * 10000) / 100;
}
