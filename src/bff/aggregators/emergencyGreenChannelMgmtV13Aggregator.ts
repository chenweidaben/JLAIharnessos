/**
 * 健澜科技 jlmedaios - 急诊绿色通道管理 V13 纯函数（M454-B，门急诊与手术麻醉管理组）
 *
 * computeEmergencyGreenChannelAcceptanceTimelinessRateV13 / computeEmergencyGreenChannelRescueSuccessRateV13 / computeEmergencyGreenChannelObservationHoursV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 急诊绿色通道管理记录 */
export interface EmergencyGreenChannelMgmtRecordV13 {
  timely: number;
  total: number;
  success: number;
  totalRescue: number;
  observationHours: number;
}

/**
 * 绿色通道接诊及时率（纯函数）：及时接诊人次/绿色通道总人次×100，保留 2 位小数。
 *
 * @param records 急诊绿色通道管理记录列表
 * @returns 绿色通道接诊及时率百分比
 */
export function computeEmergencyGreenChannelAcceptanceTimelinessRateV13(records: EmergencyGreenChannelMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.total, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timely, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 急危重症抢救成功率（纯函数）：抢救成功人数/抢救总人数×100，保留 2 位小数。
 *
 * @param records 急诊绿色通道管理记录列表
 * @returns 急危重症抢救成功率百分比
 */
export function computeEmergencyGreenChannelRescueSuccessRateV13(records: EmergencyGreenChannelMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalRescue, 0);
  if (total === 0) return 0;
  const success = records.reduce((acc, r) => acc + r.success, 0);
  return Math.round((success / total) * 10000) / 100;
}

/**
 * 急诊留观时长（纯函数，Math.ceil 整小时）：avg(observationHours) 向上取整到整小时。
 *
 * @param records 急诊绿色通道管理记录列表
 * @returns 急诊留观时长（整小时）
 */
export function computeEmergencyGreenChannelObservationHoursV13(records: EmergencyGreenChannelMgmtRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.observationHours, 0);
  return Math.ceil(sum / records.length);
}
