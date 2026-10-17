/**
 * 健澜科技 jlmedaios - 卒中中心 V13 纯函数（M348-D，M348 收官）
 *
 * computeDNTMinutesV13 / computeIVThrombolysisRateV13 / computeThrombectomyRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 卒中中心记录 */
export interface StrokeCenterRecordV13 {
  dntMinutes: number;
  ivThrombolysisCount: number;
  strokeTotalCount: number;
  thrombectomyCount: number;
}

/**
 * DNT 时间（Door-to-Needle Time，纯函数）：均值，保留 1 位小数。
 *
 * @param records 卒中中心记录列表
 * @returns DNT 时间（分钟）
 */
export function computeDNTMinutesV13(records: StrokeCenterRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.dntMinutes, 0);
  return Math.round((sum / records.length) * 10) / 10;
}

/**
 * 静脉溶栓率（纯函数）：溶栓数/卒中总数×100，保留 2 位小数。
 *
 * @param records 卒中中心记录列表
 * @returns 静脉溶栓率百分比
 */
export function computeIVThrombolysisRateV13(records: StrokeCenterRecordV13[]): number {
  const thrombolysis = records.reduce((acc, r) => acc + r.ivThrombolysisCount, 0);
  const total = records.reduce((acc, r) => acc + r.strokeTotalCount, 0);
  if (total === 0) return 0;
  return Math.round((thrombolysis / total) * 10000) / 100;
}

/**
 * 取栓率（纯函数）：取栓数/卒中总数×100，保留 2 位小数。
 *
 * @param records 卒中中心记录列表
 * @returns 取栓率百分比
 */
export function computeThrombectomyRateV13(records: StrokeCenterRecordV13[]): number {
  const thrombectomy = records.reduce((acc, r) => acc + r.thrombectomyCount, 0);
  const total = records.reduce((acc, r) => acc + r.strokeTotalCount, 0);
  if (total === 0) return 0;
  return Math.round((thrombectomy / total) * 10000) / 100;
}
