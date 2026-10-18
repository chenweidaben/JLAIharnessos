/**
 * 健澜科技 jlmedaios - 人员招聘与配置 V13 纯函数（M444-C，绩效薪酬与人力资源管理组）
 *
 * computeRecruitmentPlanCompletionRateV13 / computeRecruitmentPositionMatchingRateV13 / computeRecruitmentRetention3MonthsRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 人员招聘与配置记录 */
export interface RecruitmentMgmtRecordV13 {
  recruited: number;
  plan: number;
  matched: number;
  onboarded: number;
  retained3Months: number;
}

/**
 * 招聘计划完成率（纯函数）：已完成招聘人数/招聘计划人数×100，保留 2 位小数。
 *
 * @param records 人员招聘与配置记录列表
 * @returns 招聘计划完成率百分比
 */
export function computeRecruitmentPlanCompletionRateV13(records: RecruitmentMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.plan, 0);
  if (total === 0) return 0;
  const recruitedCount = records.reduce((acc, r) => acc + r.recruited, 0);
  return Math.round((recruitedCount / total) * 10000) / 100;
}

/**
 * 岗位匹配度（纯函数）：匹配岗位人数/入职总人数×100，保留 2 位小数。
 *
 * @param records 人员招聘与配置记录列表
 * @returns 岗位匹配度百分比
 */
export function computeRecruitmentPositionMatchingRateV13(records: RecruitmentMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.onboarded, 0);
  if (total === 0) return 0;
  const matchedCount = records.reduce((acc, r) => acc + r.matched, 0);
  return Math.round((matchedCount / total) * 10000) / 100;
}

/**
 * 入职 3 个月留存率（纯函数）：3 个月仍在职人数/入职总人数×100，保留 2 位小数。
 *
 * @param records 人员招聘与配置记录列表
 * @returns 入职 3 个月留存率百分比
 */
export function computeRecruitmentRetention3MonthsRateV13(records: RecruitmentMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.onboarded, 0);
  if (total === 0) return 0;
  const retainedCount = records.reduce((acc, r) => acc + r.retained3Months, 0);
  return Math.round((retainedCount / total) * 10000) / 100;
}
