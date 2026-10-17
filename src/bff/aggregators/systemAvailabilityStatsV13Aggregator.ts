/**
 * 健澜科技 jlmedaios - 系统可用率 V13 纯函数（M353-C，stats 避让已有 systemAvailabilityV13）
 *
 * computeHisAvailabilityRateV13 / computeMTTRMinutesV13 / computeUnplannedDowntimeMinutesV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 系统可用率记录 */
export interface SystemAvailabilityStatsRecordV13 {
  hisAvailableMinutes: number;
  hisTotalMinutes: number;
  mttrMinutes: number;
  unplannedDowntimeMinutes: number;
}

/**
 * 核心 HIS 月度可用率（纯函数）：可用分钟/总分钟×100，保留 2 位小数。
 *
 * @param records 系统可用率记录列表
 * @returns 核心 HIS 月度可用率百分比
 */
export function computeHisAvailabilityRateV13(records: SystemAvailabilityStatsRecordV13[]): number {
  const available = records.reduce((acc, r) => acc + r.hisAvailableMinutes, 0);
  const total = records.reduce((acc, r) => acc + r.hisTotalMinutes, 0);
  if (total === 0) return 0;
  return Math.round((available / total) * 10000) / 100;
}

/**
 * 故障 MTTR（纯函数）：平均修复时间，均值，保留 2 位小数，单位分钟。
 *
 * @param records 系统可用率记录列表
 * @returns 故障 MTTR（分钟）
 */
export function computeMTTRMinutesV13(records: SystemAvailabilityStatsRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.mttrMinutes, 0);
  return Math.round((sum / records.length) * 100) / 100;
}

/**
 * 计划外停机时长（纯函数）：求和，单位分钟。
 *
 * @param records 系统可用率记录列表
 * @returns 计划外停机时长（分钟）
 */
export function computeUnplannedDowntimeMinutesV13(records: SystemAvailabilityStatsRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.unplannedDowntimeMinutes, 0);
}
