/**
 * 健澜科技 jlmedaios - 胸痛中心 V13 纯函数（M348-C）
 *
 * computeDToBMinutesV13 / computeSTEMIRatioV13 / computeDoorToBalloon达标RateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 胸痛中心记录 */
export interface ChestPainCenterRecordV13 {
  dtoBMinutes: number;
  stemiCount: number;
  chestPainTotal: number;
  doorToBalloonQualified: number;
  dtoBTotal: number;
}

/**
 * D-to-B 时间（纯函数）：均值，保留 1 位小数。
 *
 * @param records 胸痛中心记录列表
 * @returns D-to-B 时间（分钟）
 */
export function computeDToBMinutesV13(records: ChestPainCenterRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.dtoBMinutes, 0);
  return Math.round((sum / records.length) * 10) / 10;
}

/**
 * STEMI 占比（纯函数）：STEMI 数/胸痛总数×100，保留 2 位小数。
 *
 * @param records 胸痛中心记录列表
 * @returns STEMI 占比百分比
 */
export function computeSTEMIRatioV13(records: ChestPainCenterRecordV13[]): number {
  const stemi = records.reduce((acc, r) => acc + r.stemiCount, 0);
  const total = records.reduce((acc, r) => acc + r.chestPainTotal, 0);
  if (total === 0) return 0;
  return Math.round((stemi / total) * 10000) / 100;
}

/**
 * 门-球时间达标率（纯函数）：达标数/D-to-B 总数×100，保留 2 位小数。
 *
 * @param records 胸痛中心记录列表
 * @returns 门-球时间达标率百分比
 */
export function computeDoorToBalloonQualifiedRateV13(records: ChestPainCenterRecordV13[]): number {
  const qualified = records.reduce((acc, r) => acc + r.doorToBalloonQualified, 0);
  const total = records.reduce((acc, r) => acc + r.dtoBTotal, 0);
  if (total === 0) return 0;
  return Math.round((qualified / total) * 10000) / 100;
}
