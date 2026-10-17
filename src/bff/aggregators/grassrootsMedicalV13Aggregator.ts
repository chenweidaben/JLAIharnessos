/**
 * 健澜科技 jlmedaios - 基层医疗协同 V13 纯函数（M324-B）
 *
 * countUpwardReferralsV13 / countDownwardReferralsV13 / computeGrassrootsRatioV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 转诊记录 */
export interface ReferralRecordV13 {
  referralType: "upward" | "downward";
}

/**
 * 上转次数（纯函数）：统计基层转上级的次数。
 *
 * @param referrals 转诊记录列表
 * @returns 上转次数
 */
export function countUpwardReferralsV13(referrals: ReferralRecordV13[]): number {
  return referrals.filter((r) => r.referralType === "upward").length;
}

/**
 * 下转次数（纯函数）：统计上级转基层康复的次数。
 *
 * @param referrals 转诊记录列表
 * @returns 下转次数
 */
export function countDownwardReferralsV13(referrals: ReferralRecordV13[]): number {
  return referrals.filter((r) => r.referralType === "downward").length;
}

/**
 * 基层就诊占比（纯函数）：基层就诊量/区域总就诊量×100。
 *
 * @param total 区域总就诊量
 * @param grassroots 基层就诊量
 * @returns 占比百分比
 */
export function computeGrassrootsRatioV13(total: number, grassroots: number): number {
  if (total === 0) return 0;
  return Math.round((grassroots / total) * 100);
}
