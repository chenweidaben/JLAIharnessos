/**
 * 健澜科技 jlmedaios - 资源利用明细 V13 纯函数（M381-D，M381 收官）
 *
 * computeBedUsageRateV13 / computeOperatingRoomUsageRateV13 / computeLargeEquipmentUsageRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 资源利用明细记录 */
export interface ResourceUtilDetailRecordV13 {
  occupiedBedDays: number;
  openBedDays: number;
  surgeryHours: number;
  openHours: number;
  usageHours: number;
  availableHours: number;
}

/**
 * 床位使用率（纯函数）：实际占用床日/实际开放床日×100，保留 2 位小数。
 *
 * @param records 资源利用明细记录列表
 * @returns 床位使用率百分比
 */
export function computeBedUsageRateV13(records: ResourceUtilDetailRecordV13[]): number {
  const open = records.reduce((acc, r) => acc + r.openBedDays, 0);
  if (open === 0) return 0;
  const occupied = records.reduce((acc, r) => acc + r.occupiedBedDays, 0);
  return Math.round((occupied / open) * 10000) / 100;
}

/**
 * 手术室使用率（纯函数）：手术时长/开放时长×100，保留 2 位小数。
 *
 * @param records 资源利用明细记录列表
 * @returns 手术室使用率百分比
 */
export function computeOperatingRoomUsageRateV13(records: ResourceUtilDetailRecordV13[]): number {
  const open = records.reduce((acc, r) => acc + r.openHours, 0);
  if (open === 0) return 0;
  const surgery = records.reduce((acc, r) => acc + r.surgeryHours, 0);
  return Math.round((surgery / open) * 10000) / 100;
}

/**
 * 大型设备使用率（纯函数）：使用时长/可使用时长×100，保留 2 位小数。
 *
 * @param records 资源利用明细记录列表
 * @returns 大型设备使用率百分比
 */
export function computeLargeEquipmentUsageRateV13(records: ResourceUtilDetailRecordV13[]): number {
  const available = records.reduce((acc, r) => acc + r.availableHours, 0);
  if (available === 0) return 0;
  const usage = records.reduce((acc, r) => acc + r.usageHours, 0);
  return Math.round((usage / available) * 10000) / 100;
}
