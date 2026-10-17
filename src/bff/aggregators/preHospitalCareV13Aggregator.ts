/**
 * 健澜科技 jlmedaios - 院前急救 V13 纯函数（M348-B）
 *
 * compute120DispatchCountV13 / computeAvgArrivalMinutesV13 / computeRescueEffectiveRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 院前急救记录 */
export interface PreHospitalCareRecordV13 {
  dispatchCount: number;
  arrivalMinutes: number;
  effectiveCount: number;
}

/**
 * 120 出车次数（纯函数）：求和。
 *
 * @param records 院前急救记录列表
 * @returns 120 出车次数
 */
export function compute120DispatchCountV13(records: PreHospitalCareRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.dispatchCount, 0);
}

/**
 * 平均到达时间（纯函数）：均值，保留 1 位小数。
 *
 * @param records 院前急救记录列表
 * @returns 平均到达时间（分钟）
 */
export function computeAvgArrivalMinutesV13(records: PreHospitalCareRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.arrivalMinutes, 0);
  return Math.round((sum / records.length) * 10) / 10;
}

/**
 * 抢救有效率（纯函数）：有效数/出车数×100，保留 2 位小数。
 *
 * @param records 院前急救记录列表
 * @returns 抢救有效率百分比
 */
export function computeRescueEffectiveRateV13(records: PreHospitalCareRecordV13[]): number {
  const effective = records.reduce((acc, r) => acc + r.effectiveCount, 0);
  const dispatch = records.reduce((acc, r) => acc + r.dispatchCount, 0);
  if (dispatch === 0) return 0;
  return Math.round((effective / dispatch) * 10000) / 100;
}
