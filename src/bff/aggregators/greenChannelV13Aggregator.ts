/**
 * 健澜科技 jlmedaios - 绿色通道 V13 纯函数（M372-D，M372 收官）
 *
 * computeGreenChannelStartCountV13 / computeGreenChannelAverageDurationV13 / computeGreenChannelRescueSuccessRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 绿色通道记录 */
export interface GreenChannelRecordV13 {
  startCount: number;
  averageDuration: number;
  rescueCount: number;
  rescueSuccessCount: number;
}

/**
 * 绿色通道启动次数（纯函数）：求和。
 *
 * @param records 绿色通道记录列表
 * @returns 绿色通道启动次数
 */
export function computeGreenChannelStartCountV13(records: GreenChannelRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.startCount, 0);
}

/**
 * 绿色通道平均耗时（纯函数）：均值，单位分钟，保留 2 位小数。
 *
 * @param records 绿色通道记录列表
 * @returns 绿色通道平均耗时（分钟）
 */
export function computeGreenChannelAverageDurationV13(records: GreenChannelRecordV13[]): number {
  if (records.length === 0) return 0;
  const total = records.reduce((acc, r) => acc + r.averageDuration, 0);
  return Math.round((total / records.length) * 100) / 100;
}

/**
 * 绿色通道抢救成功率（纯函数）：成功数/抢救数×100，保留 2 位小数。
 *
 * @param records 绿色通道记录列表
 * @returns 绿色通道抢救成功率百分比
 */
export function computeGreenChannelRescueSuccessRateV13(records: GreenChannelRecordV13[]): number {
  const rescue = records.reduce((acc, r) => acc + r.rescueCount, 0);
  if (rescue === 0) return 0;
  const success = records.reduce((acc, r) => acc + r.rescueSuccessCount, 0);
  return Math.round((success / rescue) * 10000) / 100;
}
