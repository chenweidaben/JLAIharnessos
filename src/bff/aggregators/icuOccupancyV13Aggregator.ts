/**
 * 健澜科技 jlmedaios - ICU 床位 V13 纯函数（M335-B）
 *
 * computeICUBedOccupancyV13 / computeAvgAPACHEIIV13 / computeTransferOutRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** ICU 记录 */
export interface ICURecordV13 {
  totalBedDays: number;
  occupiedBedDays: number;
  apacheIIScore: number;
  admittedCount: number;
  transferredOutCount: number;
}

/**
 * ICU 床位占用率（纯函数）：占用床日/总床日×100。
 *
 * @param records ICU 记录列表
 * @returns 占用率百分比
 */
export function computeICUBedOccupancyV13(records: ICURecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalBedDays, 0);
  const occupied = records.reduce((acc, r) => acc + r.occupiedBedDays, 0);
  if (total === 0) return 0;
  return Math.round((occupied / total) * 100);
}

/**
 * 平均 APACHE II 评分（纯函数）：均值，保留 1 位小数。
 *
 * @param records ICU 记录列表
 * @returns 平均评分
 */
export function computeAvgAPACHEIIV13(records: ICURecordV13[]): number {
  if (records.length === 0) return 0;
  const total = records.reduce((acc, r) => acc + r.apacheIIScore, 0);
  return Math.round((total / records.length) * 10) / 10;
}

/**
 * 转出率（纯函数）：转出数/入科数×100。
 *
 * @param records ICU 记录列表
 * @returns 转出率百分比
 */
export function computeTransferOutRateV13(records: ICURecordV13[]): number {
  const admitted = records.reduce((acc, r) => acc + r.admittedCount, 0);
  const transferredOut = records.reduce((acc, r) => acc + r.transferredOutCount, 0);
  if (admitted === 0) return 0;
  return Math.round((transferredOut / admitted) * 100);
}
