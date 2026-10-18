/**
 * 健澜科技 jlmedaios - 宣传管理 V13 纯函数（M450-A，宣传与党建管理组）
 *
 * computePublicityPlanCompletionRateV13 / computePublicityMediaReportCountV13 / computePublicityActivityParticipationRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 宣传管理记录 */
export interface PublicityMgmtRecordV13 {
  completed: number;
  planned: number;
  mediaReportCount: number;
  participated: number;
  shouldParticipate: number;
}

/**
 * 宣传计划完成率（纯函数）：已完成宣传项目数/宣传计划项目总数×100，保留 2 位小数。
 *
 * @param records 宣传管理记录列表
 * @returns 宣传计划完成率百分比
 */
export function computePublicityPlanCompletionRateV13(records: PublicityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.planned, 0);
  if (total === 0) return 0;
  const completed = records.reduce((acc, r) => acc + r.completed, 0);
  return Math.round((completed / total) * 10000) / 100;
}

/**
 * 媒体报道数量（纯函数，计数指标）：records.reduce 累加媒体报道篇数，直接返回计数。
 *
 * @param records 宣传管理记录列表
 * @returns 媒体报道数量（整数）
 */
export function computePublicityMediaReportCountV13(records: PublicityMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.mediaReportCount, 0);
}

/**
 * 宣传活动参与率（纯函数）：实际参与人数/应参与人数×100，保留 2 位小数。
 *
 * @param records 宣传管理记录列表
 * @returns 宣传活动参与率百分比
 */
export function computePublicityActivityParticipationRateV13(records: PublicityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldParticipate, 0);
  if (total === 0) return 0;
  const participated = records.reduce((acc, r) => acc + r.participated, 0);
  return Math.round((participated / total) * 10000) / 100;
}
