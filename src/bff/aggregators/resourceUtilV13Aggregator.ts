/**
 * 健澜科技 jlmedaios - 资源利用 V13 纯函数（M364-D，M364 收官）
 *
 * computeLargeEquipmentUtilRateV13 / computeWardUtilRateV13 / computeOrUtilRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 资源利用记录 */
export interface ResourceUtilRecordV13 {
  equipmentActualHours: number;
  equipmentRatedHours: number;
  wardOccupiedBedDays: number;
  wardOpenBedDays: number;
  orSurgeryHours: number;
  orAvailableHours: number;
}

/**
 * 大型设备使用率（纯函数）：实际使用时长/额定可用时长×100，保留 2 位小数。
 *
 * @param records 资源利用记录列表
 * @returns 大型设备使用率百分比
 */
export function computeLargeEquipmentUtilRateV13(records: ResourceUtilRecordV13[]): number {
  const actual = records.reduce((acc, r) => acc + r.equipmentActualHours, 0);
  const rated = records.reduce((acc, r) => acc + r.equipmentRatedHours, 0);
  if (rated === 0) return 0;
  return Math.round((actual / rated) * 10000) / 100;
}

/**
 * 病房使用率（纯函数）：实际占用床日/开放床日×100，保留 2 位小数。
 *
 * @param records 资源利用记录列表
 * @returns 病房使用率百分比
 */
export function computeWardUtilRateV13(records: ResourceUtilRecordV13[]): number {
  const occupied = records.reduce((acc, r) => acc + r.wardOccupiedBedDays, 0);
  const open = records.reduce((acc, r) => acc + r.wardOpenBedDays, 0);
  if (open === 0) return 0;
  return Math.round((occupied / open) * 10000) / 100;
}

/**
 * 手术室使用率（纯函数）：手术时长/可用时长×100，保留 2 位小数。
 *
 * @param records 资源利用记录列表
 * @returns 手术室使用率百分比
 */
export function computeOrUtilRateV13(records: ResourceUtilRecordV13[]): number {
  const surgery = records.reduce((acc, r) => acc + r.orSurgeryHours, 0);
  const available = records.reduce((acc, r) => acc + r.orAvailableHours, 0);
  if (available === 0) return 0;
  return Math.round((surgery / available) * 10000) / 100;
}
