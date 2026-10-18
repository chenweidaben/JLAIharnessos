/**
 * 健澜科技 jlmedaios - 门诊流程管理 V13 纯函数（M454-A，门急诊与手术麻醉管理组）
 *
 * computeOutpatientProcessAppointmentRateV13 / computeOutpatientProcessWaitingMinutesV13 / computeOutpatientProcessRevisitRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 门诊流程管理记录 */
export interface OutpatientProcessMgmtRecordV13 {
  appointed: number;
  totalVisit: number;
  waitingMinutes: number;
  revisit: number;
}

/**
 * 门诊预约率（纯函数）：预约就诊人次/门诊总人次×100，保留 2 位小数。
 *
 * @param records 门诊流程管理记录列表
 * @returns 门诊预约率百分比
 */
export function computeOutpatientProcessAppointmentRateV13(records: OutpatientProcessMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalVisit, 0);
  if (total === 0) return 0;
  const appointed = records.reduce((acc, r) => acc + r.appointed, 0);
  return Math.round((appointed / total) * 10000) / 100;
}

/**
 * 门诊候诊时长（纯函数，Math.ceil 整分钟）：avg(waitingMinutes) 向上取整到整分钟。
 *
 * @param records 门诊流程管理记录列表
 * @returns 门诊候诊时长（整分钟）
 */
export function computeOutpatientProcessWaitingMinutesV13(records: OutpatientProcessMgmtRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.waitingMinutes, 0);
  return Math.ceil(sum / records.length);
}

/**
 * 门诊复诊率（纯函数）：复诊人次/门诊总人次×100，保留 2 位小数。
 *
 * @param records 门诊流程管理记录列表
 * @returns 门诊复诊率百分比
 */
export function computeOutpatientProcessRevisitRateV13(records: OutpatientProcessMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalVisit, 0);
  if (total === 0) return 0;
  const revisit = records.reduce((acc, r) => acc + r.revisit, 0);
  return Math.round((revisit / total) * 10000) / 100;
}
