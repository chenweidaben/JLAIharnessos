/**
 * 健澜科技 jlmedaios - 危急值管理（细节）V13 纯函数（M425-A，detail 避让旧版 criticalValueMgmtV13（M411））
 *
 * computeCriticalValueNotificationTimelyRateV13 / computeCriticalValueClosedLoopRateV13 / computeCriticalValueRecordCompleteRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 危急值管理（细节）记录 */
export interface CriticalValueDetailRecordV13 {
  timelyNotified: number;
  closedLoop: number;
  recordComplete: number;
  criticalTotal: number;
}

/**
 * 危急值通报及时率（纯函数）：及时通报数/危急值总数×100，保留 2 位小数。
 *
 * @param records 危急值管理（细节）记录列表
 * @returns 危急值通报及时率百分比
 */
export function computeCriticalValueNotificationTimelyRateV13(records: CriticalValueDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.criticalTotal, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timelyNotified, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 危急值处置闭环率（纯函数）：闭环处置数/危急值总数×100，保留 2 位小数。
 *
 * @param records 危急值管理（细节）记录列表
 * @returns 危急值处置闭环率百分比
 */
export function computeCriticalValueClosedLoopRateV13(records: CriticalValueDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.criticalTotal, 0);
  if (total === 0) return 0;
  const closed = records.reduce((acc, r) => acc + r.closedLoop, 0);
  return Math.round((closed / total) * 10000) / 100;
}

/**
 * 危急值记录完整率（纯函数）：完整记录数/危急值总数×100，保留 2 位小数。
 *
 * @param records 危急值管理（细节）记录列表
 * @returns 危急值记录完整率百分比
 */
export function computeCriticalValueRecordCompleteRateV13(records: CriticalValueDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.criticalTotal, 0);
  if (total === 0) return 0;
  const complete = records.reduce((acc, r) => acc + r.recordComplete, 0);
  return Math.round((complete / total) * 10000) / 100;
}
