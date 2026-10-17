/**
 * 健澜科技 jlmedaios - 大型设备开机率 V13 纯函数（M351-B）
 *
 * computeCTHoursV13 / computeMRIHoursV13 / computeDSAHoursV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 大型设备开机记录 */
export interface EquipmentUtilizationRecordV13 {
  ctHours: number;
  mriHours: number;
  dsaHours: number;
}

/**
 * CT 月度开机小时数（纯函数）：求和。
 *
 * @param records 大型设备开机记录列表
 * @returns CT 月度开机小时数
 */
export function computeCTHoursV13(records: EquipmentUtilizationRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.ctHours, 0);
}

/**
 * MRI 月度开机小时数（纯函数）：求和。
 *
 * @param records 大型设备开机记录列表
 * @returns MRI 月度开机小时数
 */
export function computeMRIHoursV13(records: EquipmentUtilizationRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.mriHours, 0);
}

/**
 * DSA 月度开机小时数（纯函数）：求和。
 *
 * @param records 大型设备开机记录列表
 * @returns DSA 月度开机小时数
 */
export function computeDSAHoursV13(records: EquipmentUtilizationRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.dsaHours, 0);
}
