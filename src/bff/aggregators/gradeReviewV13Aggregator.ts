/**
 * 健澜科技 jlmedaios - 等级评审 V13 纯函数（M395-B）
 *
 * computeGradeAReviewClauseConformanceRateV13 / computeCoreClauseAchievementRateV13 / computeRectificationTaskCompletionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 等级评审记录 */
export interface GradeReviewRecordV13 {
  conformingCount: number;
  totalCount: number;
  achievedCount: number;
  coreTotalCount: number;
  completedCount: number;
  rectificationTotalCount: number;
}

/**
 * 三甲评审条款符合率（纯函数）：符合条款数/评审条款总数×100，保留 2 位小数。
 *
 * @param records 等级评审记录列表
 * @returns 三甲评审条款符合率百分比
 */
export function computeGradeAReviewClauseConformanceRateV13(records: GradeReviewRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCount, 0);
  if (total === 0) return 0;
  const conforming = records.reduce((acc, r) => acc + r.conformingCount, 0);
  return Math.round((conforming / total) * 10000) / 100;
}

/**
 * 核心条款达成率（纯函数）：达成核心条款数/核心条款总数×100，保留 2 位小数。
 *
 * @param records 等级评审记录列表
 * @returns 核心条款达成率百分比
 */
export function computeCoreClauseAchievementRateV13(records: GradeReviewRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.coreTotalCount, 0);
  if (total === 0) return 0;
  const achieved = records.reduce((acc, r) => acc + r.achievedCount, 0);
  return Math.round((achieved / total) * 10000) / 100;
}

/**
 * 整改任务完成率（纯函数）：已完成整改任务数/整改任务总数×100，保留 2 位小数。
 *
 * @param records 等级评审记录列表
 * @returns 整改任务完成率百分比
 */
export function computeRectificationTaskCompletionRateV13(records: GradeReviewRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.rectificationTotalCount, 0);
  if (total === 0) return 0;
  const completed = records.reduce((acc, r) => acc + r.completedCount, 0);
  return Math.round((completed / total) * 10000) / 100;
}
