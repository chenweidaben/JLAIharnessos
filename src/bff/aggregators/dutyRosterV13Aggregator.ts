/**
 * 健澜科技 jlmedaios - 值班管理 V13 纯函数（M402-B）
 *
 * computeDutyPresenceRateV13 / computeShiftSwapApprovalRateV13 / computeNightDutyCoverageRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 值班管理记录 */
export interface DutyRosterRecordV13 {
  present: number;
  total: number;
  approvedSwap: number;
  totalSwap: number;
  nightActual: number;
  nightTotal: number;
}

/**
 * 值班到岗率（纯函数）：到岗人数/应值班人数×100，保留 2 位小数。
 *
 * @param records 值班管理记录列表
 * @returns 值班到岗率百分比
 */
export function computeDutyPresenceRateV13(records: DutyRosterRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.total, 0);
  if (total === 0) return 0;
  const present = records.reduce((acc, r) => acc + r.present, 0);
  return Math.round((present / total) * 10000) / 100;
}

/**
 * 值班换班审批率（纯函数）：已审批换班数/换班申请总数×100，保留 2 位小数。
 *
 * @param records 值班管理记录列表
 * @returns 值班换班审批率百分比
 */
export function computeShiftSwapApprovalRateV13(records: DutyRosterRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalSwap, 0);
  if (total === 0) return 0;
  const approved = records.reduce((acc, r) => acc + r.approvedSwap, 0);
  return Math.round((approved / total) * 10000) / 100;
}

/**
 * 夜间值班覆盖率（纯函数）：实际夜间值班天数/应夜间值班天数×100，保留 2 位小数。
 *
 * @param records 值班管理记录列表
 * @returns 夜间值班覆盖率百分比
 */
export function computeNightDutyCoverageRateV13(records: DutyRosterRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.nightTotal, 0);
  if (total === 0) return 0;
  const actual = records.reduce((acc, r) => acc + r.nightActual, 0);
  return Math.round((actual / total) * 10000) / 100;
}
