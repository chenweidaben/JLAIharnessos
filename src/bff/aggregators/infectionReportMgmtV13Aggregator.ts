/**
 * 健澜科技 jlmedaios - 院感报告管理 V13 纯函数（M412-D，M412 收官）
 *
 * computeInfectionReportTimelyRateV13 / computeInfectionMissedReportRateV13 / computeInfectionOutbreakResponseTimeV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 院感报告管理记录 */
export interface InfectionReportMgmtRecordV13 {
  timely: number;
  total: number;
  missed: number;
  shouldTotal: number;
  responseTime: number;
}

/**
 * 院感病例报告及时率（纯函数）：及时报告数/院感病例总数×100，保留 2 位小数。
 *
 * @param records 院感报告管理记录列表
 * @returns 院感病例报告及时率百分比
 */
export function computeInfectionReportTimelyRateV13(records: InfectionReportMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.total, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timely, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 院感漏报率（纯函数）：漏报数/应报告总数×100，保留 2 位小数。
 *
 * @param records 院感报告管理记录列表
 * @returns 院感漏报率百分比
 */
export function computeInfectionMissedReportRateV13(records: InfectionReportMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldTotal, 0);
  if (total === 0) return 0;
  const missed = records.reduce((acc, r) => acc + r.missed, 0);
  return Math.round((missed / total) * 10000) / 100;
}

/**
 * 院感暴发事件响应时长（纯函数）：平均值，单位小时，Math.ceil 向上取整到整小时。
 *
 * @param records 院感报告管理记录列表
 * @returns 响应时长（整小时）
 */
export function computeInfectionOutbreakResponseTimeV13(records: InfectionReportMgmtRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.responseTime, 0);
  return Math.ceil(sum / records.length);
}
