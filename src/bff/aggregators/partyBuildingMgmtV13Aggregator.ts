/**
 * 健澜科技 jlmedaios - 党建管理 V13 纯函数（M450-B，宣传与党建管理组）
 *
 * computePartyBuildingActivityRateV13 / computePartyBuildingStudyCoverageRateV13 / computePartyBuildingTaskCompletionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 党建管理记录 */
export interface PartyBuildingMgmtRecordV13 {
  conducted: number;
  planned: number;
  studied: number;
  totalMembers: number;
  completed: number;
  totalTask: number;
}

/**
 * 党组织活动开展率（纯函数）：已开展党组织活动次数/计划开展活动次数×100，保留 2 位小数。
 *
 * @param records 党建管理记录列表
 * @returns 党组织活动开展率百分比
 */
export function computePartyBuildingActivityRateV13(records: PartyBuildingMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.planned, 0);
  if (total === 0) return 0;
  const conducted = records.reduce((acc, r) => acc + r.conducted, 0);
  return Math.round((conducted / total) * 10000) / 100;
}

/**
 * 党员学习覆盖率（纯函数）：已完成学习党员数/党员总数×100，保留 2 位小数。
 *
 * @param records 党建管理记录列表
 * @returns 党员学习覆盖率百分比
 */
export function computePartyBuildingStudyCoverageRateV13(records: PartyBuildingMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalMembers, 0);
  if (total === 0) return 0;
  const studied = records.reduce((acc, r) => acc + r.studied, 0);
  return Math.round((studied / total) * 10000) / 100;
}

/**
 * 党建任务完成率（纯函数）：已完成党建任务数/党建任务总数×100，保留 2 位小数。
 *
 * @param records 党建管理记录列表
 * @returns 党建任务完成率百分比
 */
export function computePartyBuildingTaskCompletionRateV13(records: PartyBuildingMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalTask, 0);
  if (total === 0) return 0;
  const completed = records.reduce((acc, r) => acc + r.completed, 0);
  return Math.round((completed / total) * 10000) / 100;
}
