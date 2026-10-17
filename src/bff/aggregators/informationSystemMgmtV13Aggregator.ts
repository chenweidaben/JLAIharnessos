/**
 * 健澜科技 jlmedaios - 信息系统管理 V13 纯函数（M409-A）
 *
 * computeHISAvailabilityRateV13 / computeLISAvailabilityRateV13 / computePACSAvailabilityRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 信息系统管理记录 */
export interface InformationSystemMgmtRecordV13 {
  hisUptime: number;
  hisTotal: number;
  lisUptime: number;
  lisTotal: number;
  pacsUptime: number;
  pacsTotal: number;
}

/**
 * HIS系统可用率（纯函数）：正常运行时长/应运行时长×100，保留 2 位小数。
 *
 * @param records 信息系统管理记录列表
 * @returns HIS系统可用率百分比
 */
export function computeHISAvailabilityRateV13(records: InformationSystemMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.hisTotal, 0);
  if (total === 0) return 0;
  const uptime = records.reduce((acc, r) => acc + r.hisUptime, 0);
  return Math.round((uptime / total) * 10000) / 100;
}

/**
 * LIS系统可用率（纯函数）：正常运行时长/应运行时长×100，保留 2 位小数。
 *
 * @param records 信息系统管理记录列表
 * @returns LIS系统可用率百分比
 */
export function computeLISAvailabilityRateV13(records: InformationSystemMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.lisTotal, 0);
  if (total === 0) return 0;
  const uptime = records.reduce((acc, r) => acc + r.lisUptime, 0);
  return Math.round((uptime / total) * 10000) / 100;
}

/**
 * PACS系统可用率（纯函数）：正常运行时长/应运行时长×100，保留 2 位小数。
 *
 * @param records 信息系统管理记录列表
 * @returns PACS系统可用率百分比
 */
export function computePACSAvailabilityRateV13(records: InformationSystemMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.pacsTotal, 0);
  if (total === 0) return 0;
  const uptime = records.reduce((acc, r) => acc + r.pacsUptime, 0);
  return Math.round((uptime / total) * 10000) / 100;
}
