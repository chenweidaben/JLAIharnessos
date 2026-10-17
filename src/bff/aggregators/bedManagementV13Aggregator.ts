/**
 * 健澜科技 jlmedaios - 床位管理 V13 纯函数（M373-B）
 *
 * computeActualOpenBedCountV13 / computeBedUsageRateV13 / computeBedTurnoverCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 床位管理记录 */
export interface BedManagementRecordV13 {
  actualOpenBedCount: number;
  actualOccupiedBedDays: number;
  actualOpenBedDays: number;
  dischargeCount: number;
}

/**
 * 实际开放床位数（纯函数）：求和。
 *
 * @param records 床位管理记录列表
 * @returns 实际开放床位数
 */
export function computeActualOpenBedCountV13(records: BedManagementRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.actualOpenBedCount, 0);
}

/**
 * 床位使用率（纯函数）：实际占用床日/实际开放床日×100，保留 2 位小数。
 *
 * @param records 床位管理记录列表
 * @returns 床位使用率百分比
 */
export function computeBedUsageRateV13(records: BedManagementRecordV13[]): number {
  const openDays = records.reduce((acc, r) => acc + r.actualOpenBedDays, 0);
  if (openDays === 0) return 0;
  const occupiedDays = records.reduce((acc, r) => acc + r.actualOccupiedBedDays, 0);
  return Math.round((occupiedDays / openDays) * 10000) / 100;
}

/**
 * 床位周转次数（纯函数）：出院人数/平均开放床位数，保留 2 位小数。
 *
 * @param records 床位管理记录列表
 * @returns 床位周转次数
 */
export function computeBedTurnoverCountV13(records: BedManagementRecordV13[]): number {
  const openBeds = records.reduce((acc, r) => acc + r.actualOpenBedCount, 0);
  if (openBeds === 0) return 0;
  const discharges = records.reduce((acc, r) => acc + r.dischargeCount, 0);
  return Math.round((discharges / openBeds) * 100) / 100;
}
