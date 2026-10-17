/**
 * 健澜科技 jlmedaios - 抢救记录管理 V13 纯函数（M426-A，换名避让旧版 rescueMgmtV13（M415））
 *
 * computeRescueRecordCompleteRateV13 / computeRescueRecordTimelyRateV13 / computeRescueRecordPassRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 抢救记录管理记录 */
export interface RescueRecordMgmtRecordV13 {
  recordComplete: number;
  recordTimely: number;
  recordPass: number;
  rescueTotal: number;
}

/**
 * 抢救记录完整率（纯函数）：完整抢救记录数/抢救总次数×100，保留 2 位小数。
 *
 * @param records 抢救记录管理记录列表
 * @returns 抢救记录完整率百分比
 */
export function computeRescueRecordCompleteRateV13(records: RescueRecordMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.rescueTotal, 0);
  if (total === 0) return 0;
  const complete = records.reduce((acc, r) => acc + r.recordComplete, 0);
  return Math.round((complete / total) * 10000) / 100;
}

/**
 * 抢救记录及时率（纯函数）：及时完成抢救记录数/抢救总次数×100，保留 2 位小数。
 *
 * @param records 抢救记录管理记录列表
 * @returns 抢救记录及时率百分比
 */
export function computeRescueRecordTimelyRateV13(records: RescueRecordMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.rescueTotal, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.recordTimely, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 抢救记录合格率（纯函数）：合格抢救记录数/抢救总次数×100，保留 2 位小数。
 *
 * @param records 抢救记录管理记录列表
 * @returns 抢救记录合格率百分比
 */
export function computeRescueRecordPassRateV13(records: RescueRecordMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.rescueTotal, 0);
  if (total === 0) return 0;
  const pass = records.reduce((acc, r) => acc + r.recordPass, 0);
  return Math.round((pass / total) * 10000) / 100;
}
