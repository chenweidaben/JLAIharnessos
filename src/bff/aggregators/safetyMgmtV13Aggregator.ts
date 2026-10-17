/**
 * 健澜科技 jlmedaios - 安全管理 V13 纯函数（M362-D，M362 收官）
 *
 * computeSafetyAccidentCountV13 / computeFireDrillCountV13 / computeHazardRectificationRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 安全管理记录 */
export interface SafetyMgmtRecordV13 {
  accidentCount: number;
  fireDrillCount: number;
  hazardRectified: number;
  hazardInspected: number;
}

/**
 * 安全生产事故起数（纯函数）：求和。
 *
 * @param records 安全管理记录列表
 * @returns 安全生产事故起数
 */
export function computeSafetyAccidentCountV13(records: SafetyMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.accidentCount, 0);
}

/**
 * 消防演练次数（纯函数）：求和。
 *
 * @param records 安全管理记录列表
 * @returns 消防演练次数
 */
export function computeFireDrillCountV13(records: SafetyMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.fireDrillCount, 0);
}

/**
 * 隐患整改率（纯函数）：整改数/排查数×100，保留 2 位小数。
 *
 * @param records 安全管理记录列表
 * @returns 隐患整改率百分比
 */
export function computeHazardRectificationRateV13(records: SafetyMgmtRecordV13[]): number {
  const rectified = records.reduce((acc, r) => acc + r.hazardRectified, 0);
  const inspected = records.reduce((acc, r) => acc + r.hazardInspected, 0);
  if (inspected === 0) return 0;
  return Math.round((rectified / inspected) * 10000) / 100;
}
