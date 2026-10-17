/**
 * 健澜科技 jlmedaios - 系统可用性明细 V13 纯函数（M379-C，detail 避让）
 *
 * computeCoreSystemAvailabilityRateV13 / computePlannedDowntimeHoursV13 / computeUnplannedDowntimeCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 系统可用性明细记录 */
export interface SystemAvailabilityRecordV13 {
  availableHours: number;
  totalAnnualHours: number;
  plannedDowntimeHours: number;
  unplannedDowntimeCount: number;
}

/**
 * 核心系统年可用率（纯函数）：可用时长/年总时长×100，保留 2 位小数。
 *
 * @param records 系统可用性明细记录列表
 * @returns 核心系统年可用率百分比
 */
export function computeCoreSystemAvailabilityRateV13(records: SystemAvailabilityRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalAnnualHours, 0);
  if (total === 0) return 0;
  const available = records.reduce((acc, r) => acc + r.availableHours, 0);
  return Math.round((available / total) * 10000) / 100;
}

/**
 * 计划停机时长（纯函数）：求和，单位小时。
 *
 * @param records 系统可用性明细记录列表
 * @returns 计划停机时长
 */
export function computePlannedDowntimeHoursV13(records: SystemAvailabilityRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.plannedDowntimeHours, 0);
}

/**
 * 故障停机次数（纯函数）：求和。
 *
 * @param records 系统可用性明细记录列表
 * @returns 故障停机次数
 */
export function computeUnplannedDowntimeCountV13(records: SystemAvailabilityRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.unplannedDowntimeCount, 0);
}
