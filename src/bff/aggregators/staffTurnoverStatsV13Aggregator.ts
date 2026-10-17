/**
 * 健澜科技 jlmedaios - 员工流失率 V13 纯函数（M346-A，stats 避让已有 staffTurnoverV13）
 *
 * computeMonthlyResignCountV13 / computeAvgActiveStaffV13 / computeTurnoverRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 员工流失率记录 */
export interface StaffTurnoverRecordV13 {
  resignCount: number;
  avgActiveStaff: number;
}

/**
 * 月度离职人数（纯函数）：求和。
 *
 * @param records 员工流失率记录列表
 * @returns 月度离职人数
 */
export function computeMonthlyResignCountV13(records: StaffTurnoverRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.resignCount, 0);
}

/**
 * 平均在职人数（纯函数）：均值。
 *
 * @param records 员工流失率记录列表
 * @returns 平均在职人数
 */
export function computeAvgActiveStaffV13(records: StaffTurnoverRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.avgActiveStaff, 0);
  return Math.round((sum / records.length) * 10) / 10;
}

/**
 * 流失率（纯函数）：离职/平均在职×100，保留 2 位小数。
 *
 * @param records 员工流失率记录列表
 * @returns 流失率百分比
 */
export function computeTurnoverRateV13(records: StaffTurnoverRecordV13[]): number {
  const resign = computeMonthlyResignCountV13(records);
  const active = computeAvgActiveStaffV13(records);
  if (active === 0) return 0;
  return Math.round((resign / active) * 10000) / 100;
}
