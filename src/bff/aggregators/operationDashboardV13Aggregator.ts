/**
 * 健澜科技 jlmedaios - 运营看板 V13 纯函数（M381-A）
 *
 * computeDailyOutpatientCountV13 / computeBedOccupancyRateV13 / computeSurgeryCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 运营看板记录 */
export interface OperationDashboardRecordV13 {
  dailyOutpatientCount: number;
  occupiedBedDays: number;
  openBedDays: number;
  surgeryCount: number;
}

/**
 * 日门急诊人次（纯函数）：求和。
 *
 * @param records 运营看板记录列表
 * @returns 日门急诊人次
 */
export function computeDailyOutpatientCountV13(records: OperationDashboardRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.dailyOutpatientCount, 0);
}

/**
 * 床位占用率（纯函数）：占用床日/开放床日×100，保留 2 位小数。
 *
 * @param records 运营看板记录列表
 * @returns 床位占用率百分比
 */
export function computeBedOccupancyRateV13(records: OperationDashboardRecordV13[]): number {
  const open = records.reduce((acc, r) => acc + r.openBedDays, 0);
  if (open === 0) return 0;
  const occupied = records.reduce((acc, r) => acc + r.occupiedBedDays, 0);
  return Math.round((occupied / open) * 10000) / 100;
}

/**
 * 手术台次（纯函数）：求和。
 *
 * @param records 运营看板记录列表
 * @returns 手术台次
 */
export function computeSurgeryCountV13(records: OperationDashboardRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.surgeryCount, 0);
}
