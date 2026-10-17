/**
 * 健澜科技 jlmedaios - 危急值管理 V13 纯函数（M411-A）
 *
 * computeCriticalValueReportTimelyRateV13 / computeCriticalValueClosedLoopRateV13 / computeCriticalValueRegistrationPassRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 危急值管理记录 */
export interface CriticalValueMgmtRecordV13 {
  timely: number;
  total: number;
  closedLoop: number;
  registered: number;
  registrationTotal: number;
}

/**
 * 危急值报告及时率（纯函数）：及时报告数/危急值总数×100，保留 2 位小数。
 *
 * @param records 危急值管理记录列表
 * @returns 危急值报告及时率百分比
 */
export function computeCriticalValueReportTimelyRateV13(records: CriticalValueMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.total, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timely, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 危急值处理闭环率（纯函数）：已闭环处理数/危急值总数×100，保留 2 位小数。
 *
 * @param records 危急值管理记录列表
 * @returns 危急值处理闭环率百分比
 */
export function computeCriticalValueClosedLoopRateV13(records: CriticalValueMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.total, 0);
  if (total === 0) return 0;
  const closedLoop = records.reduce((acc, r) => acc + r.closedLoop, 0);
  return Math.round((closedLoop / total) * 10000) / 100;
}

/**
 * 危急值登记合格率（纯函数）：合格登记数/登记总数×100，保留 2 位小数。
 *
 * @param records 危急值管理记录列表
 * @returns 危急值登记合格率百分比
 */
export function computeCriticalValueRegistrationPassRateV13(records: CriticalValueMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.registrationTotal, 0);
  if (total === 0) return 0;
  const registered = records.reduce((acc, r) => acc + r.registered, 0);
  return Math.round((registered / total) * 10000) / 100;
}
