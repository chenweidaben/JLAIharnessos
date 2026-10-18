/**
 * 健澜科技 jlmedaios - 信息系统可用性管理 V13 纯函数（M446-A，信息化建设与数据安全管理组）
 *
 * computeSystemAvailabilityRateV13 / computeSystemAvailabilityMajorFaultCountV13 / computeSystemAvailabilityPlannedDowntimeHoursV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 信息系统可用性管理记录 */
export interface SystemAvailabilityMgmtRecordV13 {
  availableHours: number;
  totalHours: number;
  majorFault: boolean;
  plannedDowntimeHours: number;
}

/**
 * 核心系统可用率（纯函数）：可用时长/统计周期总时长×100，保留 2 位小数。
 *
 * @param records 信息系统可用性管理记录列表
 * @returns 核心系统可用率百分比
 */
export function computeSystemAvailabilityRateV13(records: SystemAvailabilityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalHours, 0);
  if (total === 0) return 0;
  const available = records.reduce((acc, r) => acc + r.availableHours, 0);
  return Math.round((available / total) * 10000) / 100;
}

/**
 * 重大故障次数（纯函数，计数指标）：返回 records.filter(r => r.majorFault).length。
 *
 * @param records 信息系统可用性管理记录列表
 * @returns 重大故障次数（整数）
 */
export function computeSystemAvailabilityMajorFaultCountV13(records: SystemAvailabilityMgmtRecordV13[]): number {
  return records.filter((r) => r.majorFault).length;
}

/**
 * 计划内停机时长（纯函数，求和指标）：返回 records.reduce((sum, r) => sum + r.plannedDowntimeHours, 0)，Math.ceil 整小时。
 *
 * @param records 信息系统可用性管理记录列表
 * @returns 计划内停机时长（整小时，整数）
 */
export function computeSystemAvailabilityPlannedDowntimeHoursV13(records: SystemAvailabilityMgmtRecordV13[]): number {
  const sum = records.reduce((acc, r) => acc + r.plannedDowntimeHours, 0);
  return Math.ceil(sum);
}
