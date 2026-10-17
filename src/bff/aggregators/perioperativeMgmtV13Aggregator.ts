/**
 * 健澜科技 jlmedaios - 围手术期 V13 纯函数（M391-C）
 *
 * computePreopEvaluationCompletionRateV13 / computePostopFollowupCompletionRateV13 / computePostopInfectionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 围手术期记录 */
export interface PerioperativeMgmtRecordV13 {
  completedCount: number;
  shouldCount: number;
  followedUpCount: number;
  shouldFollowUpCount: number;
  infectionCount: number;
  surgeryTotalCount: number;
}

/**
 * 术前评估完成率（纯函数）：已完成评估数/应评估数×100，保留 2 位小数。
 *
 * @param records 围手术期记录列表
 * @returns 术前评估完成率百分比
 */
export function computePreopEvaluationCompletionRateV13(records: PerioperativeMgmtRecordV13[]): number {
  const should = records.reduce((acc, r) => acc + r.shouldCount, 0);
  if (should === 0) return 0;
  const completed = records.reduce((acc, r) => acc + r.completedCount, 0);
  return Math.round((completed / should) * 10000) / 100;
}

/**
 * 术后随访完成率（纯函数）：已完成随访数/应随访数×100，保留 2 位小数。
 *
 * @param records 围手术期记录列表
 * @returns 术后随访完成率百分比
 */
export function computePostopFollowupCompletionRateV13(records: PerioperativeMgmtRecordV13[]): number {
  const should = records.reduce((acc, r) => acc + r.shouldFollowUpCount, 0);
  if (should === 0) return 0;
  const followed = records.reduce((acc, r) => acc + r.followedUpCount, 0);
  return Math.round((followed / should) * 10000) / 100;
}

/**
 * 术后感染率（纯函数）：感染例数/手术总数×100，保留 2 位小数。
 *
 * @param records 围手术期记录列表
 * @returns 术后感染率百分比
 */
export function computePostopInfectionRateV13(records: PerioperativeMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.surgeryTotalCount, 0);
  if (total === 0) return 0;
  const infection = records.reduce((acc, r) => acc + r.infectionCount, 0);
  return Math.round((infection / total) * 10000) / 100;
}
