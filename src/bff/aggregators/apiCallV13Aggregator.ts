/**
 * 健澜科技 jlmedaios - API 调用量 V13 纯函数（M344-D）
 *
 * computeDailyAvgV13 / computePeakV13 / computeFailureRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** API 调用量记录 */
export interface ApiCallRecordV13 {
  totalCalls: number;
  failedCalls: number;
}

/**
 * 日调用量（纯函数）：均值。
 *
 * @param records API 调用量记录列表（每条代表一天）
 * @returns 日调用量均值
 */
export function computeDailyAvgV13(records: ApiCallRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.totalCalls, 0);
  return Math.round((sum / records.length) * 10) / 10;
}

/**
 * 峰值（纯函数）：最大值。
 *
 * @param records API 调用量记录列表
 * @returns 峰值（最大日调用量）
 */
export function computePeakV13(records: ApiCallRecordV13[]): number {
  if (records.length === 0) return 0;
  return Math.max(...records.map((r) => r.totalCalls));
}

/**
 * 失败率（纯函数）：失败数/总数×100，保留 2 位小数。
 *
 * @param records API 调用量记录列表
 * @returns 失败率百分比
 */
export function computeFailureRateV13(records: ApiCallRecordV13[]): number {
  const failed = records.reduce((acc, r) => acc + r.failedCalls, 0);
  const total = records.reduce((acc, r) => acc + r.totalCalls, 0);
  if (total === 0) return 0;
  return Math.round((failed / total) * 10000) / 100;
}
