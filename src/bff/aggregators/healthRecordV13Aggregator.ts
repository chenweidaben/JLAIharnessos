/**
 * 健澜科技 jlmedaios - 健康档案 V13 纯函数（M367-D，M367 收官）
 *
 * computeHealthRecordFilingRateV13 / computeHealthRecordUsageRateV13 / computeHealthRecordUpdateRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 健康档案记录 */
export interface HealthRecordRecordV13 {
  shouldFileCount: number;
  filedCount: number;
  totalRecords: number;
  usedRecords: number;
  updatedRecords: number;
}

/**
 * 电子健康档案建档率（纯函数）：建档人数/应建档人数×100，保留 2 位小数。
 *
 * @param records 健康档案记录列表
 * @returns 电子健康档案建档率百分比
 */
export function computeHealthRecordFilingRateV13(records: HealthRecordRecordV13[]): number {
  const should = records.reduce((acc, r) => acc + r.shouldFileCount, 0);
  if (should === 0) return 0;
  const filed = records.reduce((acc, r) => acc + r.filedCount, 0);
  return Math.round((filed / should) * 10000) / 100;
}

/**
 * 档案使用率（纯函数）：使用档案数/档案总数×100，保留 2 位小数。
 *
 * @param records 健康档案记录列表
 * @returns 档案使用率百分比
 */
export function computeHealthRecordUsageRateV13(records: HealthRecordRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalRecords, 0);
  if (total === 0) return 0;
  const used = records.reduce((acc, r) => acc + r.usedRecords, 0);
  return Math.round((used / total) * 10000) / 100;
}

/**
 * 档案更新率（纯函数）：更新档案数/档案总数×100，保留 2 位小数。
 *
 * @param records 健康档案记录列表
 * @returns 档案更新率百分比
 */
export function computeHealthRecordUpdateRateV13(records: HealthRecordRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalRecords, 0);
  if (total === 0) return 0;
  const updated = records.reduce((acc, r) => acc + r.updatedRecords, 0);
  return Math.round((updated / total) * 10000) / 100;
}
