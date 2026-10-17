/**
 * 健澜科技 jlmedaios - 手术室管理 V13 纯函数（M417-C）
 *
 * computeOperationRoomAverageWaitMinutesV13 / computeOperationRoomUtilizationRateV13 / computeOperationRoomEnvironmentSamplingPassRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 手术室管理记录 */
export interface OperationRoomMgmtRecordV13 {
  waitMinutes: number;
  usedHours: number;
  shouldUseHours: number;
  sampleQualified: number;
  sampleTotal: number;
}

/**
 * 手术室接台平均等待分钟（纯函数）：平均值，单位分钟，保留 1 位小数。
 *
 * @param records 手术室管理记录列表
 * @returns 手术室接台平均等待分钟
 */
export function computeOperationRoomAverageWaitMinutesV13(records: OperationRoomMgmtRecordV13[]): number {
  if (records.length === 0) return 0;
  const total = records.reduce((acc, r) => acc + r.waitMinutes, 0);
  return Math.round((total / records.length) * 10) / 10;
}

/**
 * 手术间利用率（纯函数）：实际使用时长/应使用时长×100，保留 2 位小数。
 *
 * @param records 手术室管理记录列表
 * @returns 手术间利用率百分比
 */
export function computeOperationRoomUtilizationRateV13(records: OperationRoomMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldUseHours, 0);
  if (total === 0) return 0;
  const usedHours = records.reduce((acc, r) => acc + r.usedHours, 0);
  return Math.round((usedHours / total) * 10000) / 100;
}

/**
 * 手术室环境采样合格率（纯函数）：合格样本数/采样总数×100，保留 2 位小数。
 *
 * @param records 手术室管理记录列表
 * @returns 手术室环境采样合格率百分比
 */
export function computeOperationRoomEnvironmentSamplingPassRateV13(records: OperationRoomMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.sampleTotal, 0);
  if (total === 0) return 0;
  const sampleQualified = records.reduce((acc, r) => acc + r.sampleQualified, 0);
  return Math.round((sampleQualified / total) * 10000) / 100;
}
