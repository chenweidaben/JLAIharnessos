/**
 * 健澜科技 jlmedaios - 双向转诊 V13 纯函数（M337-C）
 *
 * computeUpReferralCountV13 / computeDownReferralCountV13 / computeCompletionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 双向转诊记录 */
export interface ReferralRecordV13 {
  upReferralCount: number;
  downReferralCount: number;
  completedCount: number;
}

/**
 * 上转人次（纯函数）：求和。
 *
 * @param records 双向转诊记录列表
 * @returns 上转人次
 */
export function computeUpReferralCountV13(records: ReferralRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.upReferralCount, 0);
}

/**
 * 下转人次（纯函数）：求和。
 *
 * @param records 双向转诊记录列表
 * @returns 下转人次
 */
export function computeDownReferralCountV13(records: ReferralRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.downReferralCount, 0);
}

/**
 * 完成率（纯函数）：已完成数/总转诊数×100。
 *
 * @param records 双向转诊记录列表
 * @returns 完成率百分比
 */
export function computeCompletionRateV13(records: ReferralRecordV13[]): number {
  const totalUp = records.reduce((acc, r) => acc + r.upReferralCount, 0);
  const totalDown = records.reduce((acc, r) => acc + r.downReferralCount, 0);
  const total = totalUp + totalDown;
  const completed = records.reduce((acc, r) => acc + r.completedCount, 0);
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}
