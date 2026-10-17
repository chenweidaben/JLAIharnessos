/**
 * 健澜科技 jlmedaios - 预约服务统计 V13 纯函数（M378-A，stats 避让）
 *
 * computeAppointmentCountV13 / computeAppointmentVisitRateV13 / computeNoShowRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 预约服务统计记录 */
export interface AppointmentRecordV13 {
  appointmentCount: number;
  visitCount: number;
  noShowCount: number;
}

/**
 * 预约挂号人次（纯函数）：求和。
 *
 * @param records 预约服务统计记录列表
 * @returns 预约挂号人次
 */
export function computeAppointmentCountV13(records: AppointmentRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.appointmentCount, 0);
}

/**
 * 预约就诊率（纯函数）：就诊人数/预约人数×100，保留 2 位小数。
 *
 * @param records 预约服务统计记录列表
 * @returns 预约就诊率百分比
 */
export function computeAppointmentVisitRateV13(records: AppointmentRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.appointmentCount, 0);
  if (total === 0) return 0;
  const visit = records.reduce((acc, r) => acc + r.visitCount, 0);
  return Math.round((visit / total) * 10000) / 100;
}

/**
 * 爽约率（纯函数）：爽约人数/预约人数×100，保留 2 位小数。
 *
 * @param records 预约服务统计记录列表
 * @returns 爽约率百分比
 */
export function computeNoShowRateV13(records: AppointmentRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.appointmentCount, 0);
  if (total === 0) return 0;
  const noShow = records.reduce((acc, r) => acc + r.noShowCount, 0);
  return Math.round((noShow / total) * 10000) / 100;
}
