/**
 * 健澜科技 jlmedaios - 预约诊疗 V13 纯函数（M337-B）
 *
 * computeAppointmentRateV13 / computeFulfillmentRateV13 / computeNoShowRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 预约诊疗记录 */
export interface AppointmentRecordV13 {
  totalSlots: number;
  appointmentCount: number;
  visitedCount: number;
  noShowCount: number;
}

/**
 * 预约率（纯函数）：预约数/总号源数×100。
 *
 * @param records 预约诊疗记录列表
 * @returns 预约率百分比
 */
export function computeAppointmentRateV13(records: AppointmentRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalSlots, 0);
  const appointment = records.reduce((acc, r) => acc + r.appointmentCount, 0);
  if (total === 0) return 0;
  return Math.round((appointment / total) * 100);
}

/**
 * 履约率（纯函数）：实际就诊数/预约数×100。
 *
 * @param records 预约诊疗记录列表
 * @returns 履约率百分比
 */
export function computeFulfillmentRateV13(records: AppointmentRecordV13[]): number {
  const appointment = records.reduce((acc, r) => acc + r.appointmentCount, 0);
  const visited = records.reduce((acc, r) => acc + r.visitedCount, 0);
  if (appointment === 0) return 0;
  return Math.round((visited / appointment) * 100);
}

/**
 * 爽约率（纯函数）：爽约数/预约数×100。
 *
 * @param records 预约诊疗记录列表
 * @returns 爽约率百分比
 */
export function computeNoShowRateV13(records: AppointmentRecordV13[]): number {
  const appointment = records.reduce((acc, r) => acc + r.appointmentCount, 0);
  const noShow = records.reduce((acc, r) => acc + r.noShowCount, 0);
  if (appointment === 0) return 0;
  return Math.round((noShow / appointment) * 100);
}
