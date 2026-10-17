/**
 * 健澜科技 jlmedaios - 三级查房管理 V13 纯函数（M404-A）
 *
 * computeChiefPhysicianWardRoundRateV13 / computeAttendingPhysicianWardRoundRateV13 / computeResidentPhysicianWardRoundRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 三级查房管理记录 */
export interface ThreeLevelWardRoundRecordV13 {
  chiefDone: number;
  chiefTotal: number;
  attendingDone: number;
  attendingTotal: number;
  residentDone: number;
  residentTotal: number;
}

/**
 * 主任医师查房率（纯函数）：完成查房次数/应查房次数×100，保留 2 位小数。
 *
 * @param records 三级查房管理记录列表
 * @returns 主任医师查房率百分比
 */
export function computeChiefPhysicianWardRoundRateV13(records: ThreeLevelWardRoundRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.chiefTotal, 0);
  if (total === 0) return 0;
  const done = records.reduce((acc, r) => acc + r.chiefDone, 0);
  return Math.round((done / total) * 10000) / 100;
}

/**
 * 主治医师查房率（纯函数）：完成查房次数/应查房次数×100，保留 2 位小数。
 *
 * @param records 三级查房管理记录列表
 * @returns 主治医师查房率百分比
 */
export function computeAttendingPhysicianWardRoundRateV13(records: ThreeLevelWardRoundRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.attendingTotal, 0);
  if (total === 0) return 0;
  const done = records.reduce((acc, r) => acc + r.attendingDone, 0);
  return Math.round((done / total) * 10000) / 100;
}

/**
 * 住院医师查房率（纯函数）：完成查房次数/应查房次数×100，保留 2 位小数。
 *
 * @param records 三级查房管理记录列表
 * @returns 住院医师查房率百分比
 */
export function computeResidentPhysicianWardRoundRateV13(records: ThreeLevelWardRoundRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.residentTotal, 0);
  if (total === 0) return 0;
  const done = records.reduce((acc, r) => acc + r.residentDone, 0);
  return Math.round((done / total) * 10000) / 100;
}
