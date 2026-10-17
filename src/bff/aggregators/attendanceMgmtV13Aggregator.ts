/**
 * 健澜科技 jlmedaios - 考勤管理 V13 纯函数（M402-C）
 *
 * computeAttendanceRateV13 / computeLateEarlyRateV13 / computeOvertimeHoursV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 考勤管理记录 */
export interface AttendanceMgmtRecordV13 {
  attended: number;
  total: number;
  lateEarly: number;
  totalAttendance: number;
  overtime: number;
}

/**
 * 出勤率（纯函数）：实际出勤人数/应出勤人数×100，保留 2 位小数。
 *
 * @param records 考勤管理记录列表
 * @returns 出勤率百分比
 */
export function computeAttendanceRateV13(records: AttendanceMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.total, 0);
  if (total === 0) return 0;
  const attended = records.reduce((acc, r) => acc + r.attended, 0);
  return Math.round((attended / total) * 10000) / 100;
}

/**
 * 迟到早退率（纯函数）：迟到早退人次/总出勤人次×100，保留 2 位小数。
 *
 * @param records 考勤管理记录列表
 * @returns 迟到早退率百分比
 */
export function computeLateEarlyRateV13(records: AttendanceMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalAttendance, 0);
  if (total === 0) return 0;
  const lateEarly = records.reduce((acc, r) => acc + r.lateEarly, 0);
  return Math.round((lateEarly / total) * 10000) / 100;
}

/**
 * 加班时长（纯函数）：求和，单位小时。
 *
 * @param records 考勤管理记录列表
 * @returns 加班时长（小时）
 */
export function computeOvertimeHoursV13(records: AttendanceMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.overtime, 0);
}
