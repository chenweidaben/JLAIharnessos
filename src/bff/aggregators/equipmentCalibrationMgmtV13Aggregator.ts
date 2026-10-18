/**
 * 健澜科技 jlmedaios - 设备计量校准管理 V13 纯函数（M449-C，医疗装备与设备管理组）
 *
 * computeEquipmentCalibrationPeriodicRateV13 / computeEquipmentCalibrationQualifiedRateV13 / computeEquipmentCalibrationMandatoryCoverageRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 设备计量校准管理记录 */
export interface EquipmentCalibrationMgmtRecordV13 {
  ontime: number;
  shouldCalibrate: number;
  qualified: number;
  totalCalibrated: number;
  covered: number;
  totalMandatory: number;
}

/**
 * 计量器具周期校准率（纯函数）：按期校准器具数/应校准器具总数×100，保留 2 位小数。
 *
 * @param records 设备计量校准管理记录列表
 * @returns 计量器具周期校准率百分比
 */
export function computeEquipmentCalibrationPeriodicRateV13(records: EquipmentCalibrationMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldCalibrate, 0);
  if (total === 0) return 0;
  const ontime = records.reduce((acc, r) => acc + r.ontime, 0);
  return Math.round((ontime / total) * 10000) / 100;
}

/**
 * 校准合格率（纯函数）：校准合格器具数/校准器具总数×100，保留 2 位小数。
 *
 * @param records 设备计量校准管理记录列表
 * @returns 校准合格率百分比
 */
export function computeEquipmentCalibrationQualifiedRateV13(records: EquipmentCalibrationMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCalibrated, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualified, 0);
  return Math.round((qualified / total) * 10000) / 100;
}

/**
 * 强检器具覆盖率（纯函数）：已覆盖强检器具数/强检器具总数×100，保留 2 位小数。
 *
 * @param records 设备计量校准管理记录列表
 * @returns 强检器具覆盖率百分比
 */
export function computeEquipmentCalibrationMandatoryCoverageRateV13(records: EquipmentCalibrationMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalMandatory, 0);
  if (total === 0) return 0;
  const covered = records.reduce((acc, r) => acc + r.covered, 0);
  return Math.round((covered / total) * 10000) / 100;
}
