/**
 * 健澜科技 jlmedaios - 投诉管理明细 V13 纯函数（M398-A，避让旧版 complaintMgmtV13/complaintMgmtStatsV13）
 *
 * computeComplaintCountV13 / computeComplaintHandlingTimelyRateV13 / computeComplaintSatisfactionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 投诉管理明细记录 */
export interface ComplaintMgmtDetailRecordV13 {
  complaintCount: number;
  timelyCount: number;
  satisfiedCount: number;
  handledCount: number;
}

/**
 * 投诉总数（纯函数）：求和。
 *
 * @param records 投诉管理明细记录列表
 * @returns 投诉总数
 */
export function computeComplaintCountV13(records: ComplaintMgmtDetailRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.complaintCount, 0);
}

/**
 * 投诉处理及时率（纯函数）：及时处理数/投诉总数×100，保留 2 位小数。
 *
 * @param records 投诉管理明细记录列表
 * @returns 投诉处理及时率百分比
 */
export function computeComplaintHandlingTimelyRateV13(records: ComplaintMgmtDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.complaintCount, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timelyCount, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 投诉满意度（纯函数）：满意投诉数/已处理投诉数×100，保留 2 位小数。
 *
 * @param records 投诉管理明细记录列表
 * @returns 投诉满意度百分比
 */
export function computeComplaintSatisfactionRateV13(records: ComplaintMgmtDetailRecordV13[]): number {
  const handled = records.reduce((acc, r) => acc + r.handledCount, 0);
  if (handled === 0) return 0;
  const satisfied = records.reduce((acc, r) => acc + r.satisfiedCount, 0);
  return Math.round((satisfied / handled) * 10000) / 100;
}
