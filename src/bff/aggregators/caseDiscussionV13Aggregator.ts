/**
 * 健澜科技 jlmedaios - 病例讨论 V13 纯函数（M404-C）
 *
 * computeDifficultCaseDiscussionRateV13 / computeDeathCaseDiscussionRateV13 / computePreoperativeDiscussionCompletionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 病例讨论记录 */
export interface CaseDiscussionRecordV13 {
  discussedDifficult: number;
  totalDifficult: number;
  discussedDeath: number;
  totalDeath: number;
  completedPreop: number;
  totalPreop: number;
}

/**
 * 疑难病例讨论率（纯函数）：已讨论疑难病例数/应讨论疑难病例数×100，保留 2 位小数。
 *
 * @param records 病例讨论记录列表
 * @returns 疑难病例讨论率百分比
 */
export function computeDifficultCaseDiscussionRateV13(records: CaseDiscussionRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalDifficult, 0);
  if (total === 0) return 0;
  const discussed = records.reduce((acc, r) => acc + r.discussedDifficult, 0);
  return Math.round((discussed / total) * 10000) / 100;
}

/**
 * 死亡病例讨论率（纯函数）：已讨论死亡病例数/死亡病例总数×100，保留 2 位小数。
 *
 * @param records 病例讨论记录列表
 * @returns 死亡病例讨论率百分比
 */
export function computeDeathCaseDiscussionRateV13(records: CaseDiscussionRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalDeath, 0);
  if (total === 0) return 0;
  const discussed = records.reduce((acc, r) => acc + r.discussedDeath, 0);
  return Math.round((discussed / total) * 10000) / 100;
}

/**
 * 术前讨论完成率（纯函数）：已完成术前讨论数/应完成术前讨论数×100，保留 2 位小数。
 *
 * @param records 病例讨论记录列表
 * @returns 术前讨论完成率百分比
 */
export function computePreoperativeDiscussionCompletionRateV13(records: CaseDiscussionRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalPreop, 0);
  if (total === 0) return 0;
  const completed = records.reduce((acc, r) => acc + r.completedPreop, 0);
  return Math.round((completed / total) * 10000) / 100;
}
