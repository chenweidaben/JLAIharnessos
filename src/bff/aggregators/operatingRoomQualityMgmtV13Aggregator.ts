/**
 * 健澜科技 jlmedaios - 手术室质量管理 V13 纯函数（M429-C，-quality 后缀避让旧版 operatingRoomMgmtV13（M417））
 *
 * computeOperatingRoomSterilePassRateV13 / computeOperatingRoomContinuousSurgeryMinutesV13 / computeOperatingRoomConsumableWasteRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 手术室质量管理记录 */
export interface OperatingRoomQualityMgmtRecordV13 {
  sterilePass: number;
  sterileTotal: number;
  continuousMinutes: number;
  wasteAmount: number;
  totalAmount: number;
}

/**
 * 手术室无菌合格率（纯函数）：无菌检查合格间次/检查总间次×100，保留 2 位小数。
 *
 * @param records 手术室质量管理记录列表
 * @returns 手术室无菌合格率百分比
 */
export function computeOperatingRoomSterilePassRateV13(records: OperatingRoomQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.sterileTotal, 0);
  if (total === 0) return 0;
  const pass = records.reduce((acc, r) => acc + r.sterilePass, 0);
  return Math.round((pass / total) * 10000) / 100;
}

/**
 * 手术室连台时间（纯函数）：平均值，单位分钟，Math.ceil 整分钟向上取整。
 *
 * @param records 手术室质量管理记录列表
 * @returns 手术室连台时间平均值（整分钟）
 */
export function computeOperatingRoomContinuousSurgeryMinutesV13(records: OperatingRoomQualityMgmtRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.continuousMinutes, 0);
  const avg = sum / records.length;
  return Math.ceil(avg);
}

/**
 * 手术室耗材浪费率（纯函数，百分率%，反向指标，值越低越好）：浪费耗材金额/耗材总金额×100，保留 2 位小数。
 *
 * @param records 手术室质量管理记录列表
 * @returns 手术室耗材浪费率百分比
 */
export function computeOperatingRoomConsumableWasteRateV13(records: OperatingRoomQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalAmount, 0);
  if (total === 0) return 0;
  const waste = records.reduce((acc, r) => acc + r.wasteAmount, 0);
  return Math.round((waste / total) * 10000) / 100;
}
