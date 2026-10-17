/**
 * 健澜科技 jlmedaios - 核心系统可用率 V13 纯函数（M344-A）
 *
 * computeHISAvailabilityV13 / computeEMRAvailabilityV13 /
 * computeLISAvailabilityV13 / computePACSAvailabilityV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 核心系统可用率记录 */
export interface SystemAvailabilityRecordV13 {
  hisAvailableMinutes: number;
  hisTotalMinutes: number;
  emrAvailableMinutes: number;
  emrTotalMinutes: number;
  lisAvailableMinutes: number;
  lisTotalMinutes: number;
  pacsAvailableMinutes: number;
  pacsTotalMinutes: number;
}

/**
 * 可用率计算器（纯函数内部工具）：可用分钟/总分钟×100，保留 2 位小数。
 *
 * @param available 可用分钟数（求和后）
 * @param total 总分钟数（求和后）
 * @returns 可用率百分比
 */
function availability(available: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((available / total) * 10000) / 100;
}

/**
 * HIS 月度可用率（纯函数）：可用分钟/总分钟×100。
 *
 * @param records 核心系统可用率记录列表
 * @returns HIS 月度可用率百分比
 */
export function computeHISAvailabilityV13(records: SystemAvailabilityRecordV13[]): number {
  const available = records.reduce((acc, r) => acc + r.hisAvailableMinutes, 0);
  const total = records.reduce((acc, r) => acc + r.hisTotalMinutes, 0);
  return availability(available, total);
}

/**
 * EMR 月度可用率（纯函数）：可用分钟/总分钟×100。
 *
 * @param records 核心系统可用率记录列表
 * @returns EMR 月度可用率百分比
 */
export function computeEMRAvailabilityV13(records: SystemAvailabilityRecordV13[]): number {
  const available = records.reduce((acc, r) => acc + r.emrAvailableMinutes, 0);
  const total = records.reduce((acc, r) => acc + r.emrTotalMinutes, 0);
  return availability(available, total);
}

/**
 * LIS 月度可用率（纯函数）：可用分钟/总分钟×100。
 *
 * @param records 核心系统可用率记录列表
 * @returns LIS 月度可用率百分比
 */
export function computeLISAvailabilityV13(records: SystemAvailabilityRecordV13[]): number {
  const available = records.reduce((acc, r) => acc + r.lisAvailableMinutes, 0);
  const total = records.reduce((acc, r) => acc + r.lisTotalMinutes, 0);
  return availability(available, total);
}

/**
 * PACS 月度可用率（纯函数）：可用分钟/总分钟×100。
 *
 * @param records 核心系统可用率记录列表
 * @returns PACS 月度可用率百分比
 */
export function computePACSAvailabilityV13(records: SystemAvailabilityRecordV13[]): number {
  const available = records.reduce((acc, r) => acc + r.pacsAvailableMinutes, 0);
  const total = records.reduce((acc, r) => acc + r.pacsTotalMinutes, 0);
  return availability(available, total);
}
