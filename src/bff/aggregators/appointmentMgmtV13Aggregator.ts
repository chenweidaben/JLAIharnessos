/**
 * 健澜科技 jlmedaios - 预约管理 V13 纯函数（M390-A）
 *
 * computeAppointmentVisitRateV13 / computeAppointmentCancelRateV13 / computeAppointmentNoShowRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 预约管理记录 */
export interface AppointmentMgmtRecordV13 {
  visitCount: number;
  cancelCount: number;
  noShowCount: number;
  appointmentTotalCount: number;
}

/**
 * 预约就诊率（纯函数）：实际就诊数/预约总数×100，保留 2 位小数。
 *
 * @param records 预约管理记录列表
 * @returns 预约就诊率百分比
 */
export function computeAppointmentVisitRateV13(records: AppointmentMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.appointmentTotalCount, 0);
  if (total === 0) return 0;
  const visit = records.reduce((acc, r) => acc + r.visitCount, 0);
  return Math.round((visit / total) * 10000) / 100;
}

/**
 * 预约取消率（纯函数）：取消数/预约总数×100，保留 2 位小数。
 *
 * @param records 预约管理记录列表
 * @returns 预约取消率百分比
 */
export function computeAppointmentCancelRateV13(records: AppointmentMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.appointmentTotalCount, 0);
  if (total === 0) return 0;
  const cancel = records.reduce((acc, r) => acc + r.cancelCount, 0);
  return Math.round((cancel / total) * 10000) / 100;
}

/**
 * 爽约率（纯函数）：爽约数/预约总数×100，保留 2 位小数。
 *
 * @param records 预约管理记录列表
 * @returns 爽约率百分比
 */
export function computeAppointmentNoShowRateV13(records: AppointmentMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.appointmentTotalCount, 0);
  if (total === 0) return 0;
  const noShow = records.reduce((acc, r) => acc + r.noShowCount, 0);
  return Math.round((noShow / total) * 10000) / 100;
}
