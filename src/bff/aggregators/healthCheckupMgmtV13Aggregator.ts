/**
 * 健澜科技 jlmedaios - 健康管理体检管理 V13 纯函数（M459-B，医院运营与健康管理组）
 *
 * 备注：M455 曾派此名但中途改规格为药品供应，旧文件已物理删除回滚；本切片按新规格重新落盘。
 *
 * computeHealthCheckupAppointmentRateV13 / computeHealthCheckupReportIssueTimelyRateV13 / computeHealthCheckupAbnormalFollowupRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 健康管理体检管理记录 */
export interface HealthCheckupMgmtRecordV13 {
  booked: number;
  total: number;
  timely: number;
  totalReport: number;
  followedUp: number;
  totalAbnormal: number;
}

/**
 * 体检预约率（纯函数）：已预约体检人数/应体检总人数×100，保留 2 位小数。
 *
 * @param records 健康管理体检管理记录列表
 * @returns 体检预约率百分比
 */
export function computeHealthCheckupAppointmentRateV13(records: HealthCheckupMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.total, 0);
  if (total === 0) return 0;
  const booked = records.reduce((acc, r) => acc + r.booked, 0);
  return Math.round((booked / total) * 10000) / 100;
}

/**
 * 体检报告出具及时率（纯函数）：及时出具报告数/应出具报告总数×100，保留 2 位小数。
 *
 * @param records 健康管理体检管理记录列表
 * @returns 体检报告出具及时率百分比
 */
export function computeHealthCheckupReportIssueTimelyRateV13(records: HealthCheckupMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalReport, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timely, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 体检异常随访率（纯函数）：已随访异常人数/体检异常总人数×100，保留 2 位小数。
 *
 * @param records 健康管理体检管理记录列表
 * @returns 体检异常随访率百分比
 */
export function computeHealthCheckupAbnormalFollowupRateV13(records: HealthCheckupMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalAbnormal, 0);
  if (total === 0) return 0;
  const followedUp = records.reduce((acc, r) => acc + r.followedUp, 0);
  return Math.round((followedUp / total) * 10000) / 100;
}
