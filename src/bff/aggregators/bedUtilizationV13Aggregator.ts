/**
 * 健澜科技 jlmedaios - 床位利用 V13 纯函数（M396-A）
 *
 * computeBedUtilizationRateV13 / computeBedTurnoverRateV13 / computeAverageLengthOfStayV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 床位利用记录 */
export interface BedUtilizationRecordV13 {
  occupiedBedDays: number;
  openBedDays: number;
  dischargeCount: number;
  avgOpenBeds: number;
  patientBedDays: number;
}

/**
 * 床位使用率（纯函数）：实际占用床日数/开放床日数×100，保留 2 位小数。
 *
 * @param records 床位利用记录列表
 * @returns 床位使用率百分比
 */
export function computeBedUtilizationRateV13(records: BedUtilizationRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.openBedDays, 0);
  if (total === 0) return 0;
  const occupied = records.reduce((acc, r) => acc + r.occupiedBedDays, 0);
  return Math.round((occupied / total) * 10000) / 100;
}

/**
 * 床位周转次数（纯函数）：出院人数/平均开放床位数，保留 2 位小数。
 *
 * @param records 床位利用记录列表
 * @returns 床位周转次数
 */
export function computeBedTurnoverRateV13(records: BedUtilizationRecordV13[]): number {
  const totalBeds = records.reduce((acc, r) => acc + r.avgOpenBeds, 0);
  if (totalBeds === 0) return 0;
  const discharges = records.reduce((acc, r) => acc + r.dischargeCount, 0);
  return Math.round((discharges / totalBeds) * 100) / 100;
}

/**
 * 平均住院日（纯函数）：出院者占用总床日数/出院人数，保留 2 位小数。
 *
 * @param records 床位利用记录列表
 * @returns 平均住院日天数
 */
export function computeAverageLengthOfStayV13(records: BedUtilizationRecordV13[]): number {
  const totalDischarges = records.reduce((acc, r) => acc + r.dischargeCount, 0);
  if (totalDischarges === 0) return 0;
  const totalBedDays = records.reduce((acc, r) => acc + r.patientBedDays, 0);
  return Math.round((totalBedDays / totalDischarges) * 100) / 100;
}
