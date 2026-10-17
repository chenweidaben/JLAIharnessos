/**
 * 健澜科技 jlmedaios - 急诊管理 V13 纯函数（M416-B）
 *
 * computeErTriageAccuracyRateV13 / computeErStayOver48hRateV13 / computeErRescueRoomAvgStayHoursV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 急诊管理记录 */
export interface ErMgmtRecordV13 {
  accurate: number;
  triageTotal: number;
  over48h: number;
  erPatientTotal: number;
  stayHours: number;
}

/**
 * 急诊分诊准确率（纯函数）：准确分诊例数/急诊分诊总数×100，保留 2 位小数。
 *
 * @param records 急诊管理记录列表
 * @returns 急诊分诊准确率百分比
 */
export function computeErTriageAccuracyRateV13(records: ErMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.triageTotal, 0);
  if (total === 0) return 0;
  const accurate = records.reduce((acc, r) => acc + r.accurate, 0);
  return Math.round((accurate / total) * 10000) / 100;
}

/**
 * 急诊滞留时间超48h患者比例（纯函数，反向指标，值越低越好）：超48h患者数/急诊患者总数×100，保留 2 位小数。
 *
 * @param records 急诊管理记录列表
 * @returns 急诊滞留时间超48h患者比例百分比
 */
export function computeErStayOver48hRateV13(records: ErMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.erPatientTotal, 0);
  if (total === 0) return 0;
  const over48h = records.reduce((acc, r) => acc + r.over48h, 0);
  return Math.round((over48h / total) * 10000) / 100;
}

/**
 * 急诊抢救室平均停留小时（纯函数）：平均值，单位小时，Math.ceil 整小时。
 *
 * @param records 急诊管理记录列表
 * @returns 急诊抢救室平均停留小时（整小时）
 */
export function computeErRescueRoomAvgStayHoursV13(records: ErMgmtRecordV13[]): number {
  if (records.length === 0) return 0;
  const total = records.reduce((acc, r) => acc + r.stayHours, 0);
  return Math.ceil(total / records.length);
}
