/**
 * 健澜科技 jlmedaios - 床位使用 V13 纯函数（M345-D）
 *
 * computeBedOccupancyRateV13 / computeAvgLosV13 / computeBedTurnoverV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 床位使用记录 */
export interface BedOccupancyRecordV13 {
  occupiedBedDays: number;
  openBedDays: number;
  avgLos: number;
  dischargedPatients: number;
  avgBeds: number;
}

/**
 * 床位使用率（纯函数）：实际占用床日/实际开放床日×100，保留 2 位小数。
 *
 * @param records 床位使用记录列表
 * @returns 床位使用率百分比
 */
export function computeBedOccupancyRateV13(records: BedOccupancyRecordV13[]): number {
  const occupied = records.reduce((acc, r) => acc + r.occupiedBedDays, 0);
  const open = records.reduce((acc, r) => acc + r.openBedDays, 0);
  if (open === 0) return 0;
  return Math.round((occupied / open) * 10000) / 100;
}

/**
 * 平均住院日（纯函数）：均值，保留 1 位小数。
 *
 * @param records 床位使用记录列表
 * @returns 平均住院日（天）
 */
export function computeAvgLosV13(records: BedOccupancyRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.avgLos, 0);
  return Math.round((sum / records.length) * 10) / 10;
}

/**
 * 床位周转次数（纯函数）：期内出院人数/平均开放床位数，保留 1 位小数。
 *
 * @param records 床位使用记录列表
 * @returns 床位周转次数
 */
export function computeBedTurnoverV13(records: BedOccupancyRecordV13[]): number {
  const discharged = records.reduce((acc, r) => acc + r.dischargedPatients, 0);
  const beds = records.reduce((acc, r) => acc + r.avgBeds, 0);
  if (beds === 0) return 0;
  return Math.round((discharged / beds) * 10) / 10;
}
