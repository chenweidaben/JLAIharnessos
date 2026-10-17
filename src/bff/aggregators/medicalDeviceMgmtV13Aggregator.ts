/**
 * 健澜科技 jlmedaios - 医疗器械管理 V13 纯函数（M408-A）
 *
 * computeMedicalDeviceIntegrityRateV13 / computeMedicalDeviceInspectionPassRateV13 / computeMetrologicalTestPassRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医疗器械管理记录 */
export interface MedicalDeviceMgmtRecordV13 {
  intact: number;
  total: number;
  inspPass: number;
  inspTotal: number;
  metPass: number;
  metTotal: number;
}

/**
 * 设备完好率（纯函数）：完好设备数/设备总数×100，保留 2 位小数。
 *
 * @param records 医疗器械管理记录列表
 * @returns 设备完好率百分比
 */
export function computeMedicalDeviceIntegrityRateV13(records: MedicalDeviceMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.total, 0);
  if (total === 0) return 0;
  const intact = records.reduce((acc, r) => acc + r.intact, 0);
  return Math.round((intact / total) * 10000) / 100;
}

/**
 * 设备巡检合格率（纯函数）：合格巡检次数/巡检总次数×100，保留 2 位小数。
 *
 * @param records 医疗器械管理记录列表
 * @returns 设备巡检合格率百分比
 */
export function computeMedicalDeviceInspectionPassRateV13(records: MedicalDeviceMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.inspTotal, 0);
  if (total === 0) return 0;
  const pass = records.reduce((acc, r) => acc + r.inspPass, 0);
  return Math.round((pass / total) * 10000) / 100;
}

/**
 * 计量检测合格率（纯函数）：合格计量器具数/计量器具总数×100，保留 2 位小数。
 *
 * @param records 医疗器械管理记录列表
 * @returns 计量检测合格率百分比
 */
export function computeMetrologicalTestPassRateV13(records: MedicalDeviceMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.metTotal, 0);
  if (total === 0) return 0;
  const pass = records.reduce((acc, r) => acc + r.metPass, 0);
  return Math.round((pass / total) * 10000) / 100;
}
