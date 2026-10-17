/**
 * 健澜科技 jlmedaios - 投诉管理 V13 纯函数（M354-C）
 *
 * computeClosureRateV13 / computeFollowUpSatisfactionV13 / computeRepeatComplaintRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 投诉管理记录 */
export interface ComplaintMgmtRecordV13 {
  complaintCount: number;
  closedCount: number;
  followUpSatisfaction: number;
  repeatComplaintCount: number;
}

/**
 * 投诉办结率（纯函数）：办结数/投诉数×100，保留 2 位小数。
 *
 * @param records 投诉管理记录列表
 * @returns 投诉办结率百分比
 */
export function computeClosureRateV13(records: ComplaintMgmtRecordV13[]): number {
  const closed = records.reduce((acc, r) => acc + r.closedCount, 0);
  const complaints = records.reduce((acc, r) => acc + r.complaintCount, 0);
  if (complaints === 0) return 0;
  return Math.round((closed / complaints) * 10000) / 100;
}

/**
 * 投诉回访满意度（纯函数）：均值，保留 2 位小数。
 *
 * @param records 投诉管理记录列表
 * @returns 投诉回访满意度均值
 */
export function computeFollowUpSatisfactionV13(records: ComplaintMgmtRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.followUpSatisfaction, 0);
  return Math.round((sum / records.length) * 100) / 100;
}

/**
 * 重复投诉率（纯函数）：重复数/投诉数×100，保留 2 位小数。
 *
 * @param records 投诉管理记录列表
 * @returns 重复投诉率百分比
 */
export function computeRepeatComplaintRateV13(records: ComplaintMgmtRecordV13[]): number {
  const repeat = records.reduce((acc, r) => acc + r.repeatComplaintCount, 0);
  const complaints = records.reduce((acc, r) => acc + r.complaintCount, 0);
  if (complaints === 0) return 0;
  return Math.round((repeat / complaints) * 10000) / 100;
}
