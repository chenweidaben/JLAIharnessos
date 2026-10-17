/**
 * 健澜科技 jlmedaios - 投诉管理（统计）V13 纯函数（M365-B，stats避让）
 *
 * computeComplaintTimelyRateV13 / computeComplaintResolveRateV13 / computeRepeatComplaintRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 投诉管理（统计）记录 */
export interface ComplaintMgmtStatsRecordV13 {
  complaintCount: number;
  timelyProcessed: number;
  resolved: number;
  repeated: number;
}

/**
 * 投诉处理及时率（纯函数）：及时处理数/投诉数×100，保留 2 位小数。
 *
 * @param records 投诉管理记录列表
 * @returns 投诉处理及时率百分比
 */
export function computeComplaintTimelyRateV13(records: ComplaintMgmtStatsRecordV13[]): number {
  const complaints = records.reduce((acc, r) => acc + r.complaintCount, 0);
  if (complaints === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timelyProcessed, 0);
  return Math.round((timely / complaints) * 10000) / 100;
}

/**
 * 投诉解决率（纯函数）：解决数/投诉数×100，保留 2 位小数。
 *
 * @param records 投诉管理记录列表
 * @returns 投诉解决率百分比
 */
export function computeComplaintResolveRateV13(records: ComplaintMgmtStatsRecordV13[]): number {
  const complaints = records.reduce((acc, r) => acc + r.complaintCount, 0);
  if (complaints === 0) return 0;
  const resolved = records.reduce((acc, r) => acc + r.resolved, 0);
  return Math.round((resolved / complaints) * 10000) / 100;
}

/**
 * 重复投诉率（纯函数）：重复数/投诉数×100，保留 2 位小数。
 *
 * @param records 投诉管理记录列表
 * @returns 重复投诉率百分比
 */
export function computeRepeatComplaintRateV13(records: ComplaintMgmtStatsRecordV13[]): number {
  const complaints = records.reduce((acc, r) => acc + r.complaintCount, 0);
  if (complaints === 0) return 0;
  const repeated = records.reduce((acc, r) => acc + r.repeated, 0);
  return Math.round((repeated / complaints) * 10000) / 100;
}
