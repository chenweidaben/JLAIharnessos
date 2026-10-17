/**
 * 健澜科技 jlmedaios - 门诊服务 V13 纯函数（M372-A）
 *
 * computeOutpatientCountV13 / computeOutpatientAverageWaitTimeV13 / computeOutpatientAppointmentRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 门诊服务记录 */
export interface OutpatientServiceRecordV13 {
  outpatientCount: number;
  averageWaitTime: number;
  appointmentCount: number;
}

/**
 * 门诊人次（纯函数）：求和。
 *
 * @param records 门诊服务记录列表
 * @returns 门诊人次
 */
export function computeOutpatientCountV13(records: OutpatientServiceRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.outpatientCount, 0);
}

/**
 * 门诊平均候诊时间（纯函数）：均值，单位分钟，保留 2 位小数。
 *
 * @param records 门诊服务记录列表
 * @returns 门诊平均候诊时间（分钟）
 */
export function computeOutpatientAverageWaitTimeV13(records: OutpatientServiceRecordV13[]): number {
  if (records.length === 0) return 0;
  const total = records.reduce((acc, r) => acc + r.averageWaitTime, 0);
  return Math.round((total / records.length) * 100) / 100;
}

/**
 * 门诊预约率（纯函数）：预约人数/门诊总人数×100，保留 2 位小数。
 *
 * @param records 门诊服务记录列表
 * @returns 门诊预约率百分比
 */
export function computeOutpatientAppointmentRateV13(records: OutpatientServiceRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.outpatientCount, 0);
  if (total === 0) return 0;
  const appointment = records.reduce((acc, r) => acc + r.appointmentCount, 0);
  return Math.round((appointment / total) * 10000) / 100;
}
