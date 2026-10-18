/**
 * 健澜科技 jlmedaios - 科研成果转化管理 V13 纯函数（M456-B，学科建设与科研管理组）
 *
 * computeResearchAchievementTransformRegistrationCountV13 / computeResearchAchievementTransformRateV13 / computeResearchAchievementTransformHorizontalFundRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 科研成果转化管理记录 */
export interface ResearchAchievementTransformMgmtRecordV13 {
  achievementCount: number;
  transformed: number;
  totalRegistered: number;
  received: number;
  totalContract: number;
}

/**
 * 成果登记数量（纯函数，reduce 累加）：records.reduce((acc, r) => acc + r.achievementCount, 0)，直接返回计数。
 *
 * @param records 科研成果转化管理记录列表
 * @returns 成果登记总量（件）
 */
export function computeResearchAchievementTransformRegistrationCountV13(records: ResearchAchievementTransformMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.achievementCount, 0);
}

/**
 * 成果转化率（纯函数）：已转化成果数/已登记成果总数×100，保留 2 位小数。
 *
 * @param records 科研成果转化管理记录列表
 * @returns 成果转化率百分比
 */
export function computeResearchAchievementTransformRateV13(records: ResearchAchievementTransformMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalRegistered, 0);
  if (total === 0) return 0;
  const transformed = records.reduce((acc, r) => acc + r.transformed, 0);
  return Math.round((transformed / total) * 10000) / 100;
}

/**
 * 横向课题到款率（纯函数）：横向课题实际到款金额/横向课题合同总金额×100，保留 2 位小数。
 *
 * @param records 科研成果转化管理记录列表
 * @returns 横向课题到款率百分比
 */
export function computeResearchAchievementTransformHorizontalFundRateV13(records: ResearchAchievementTransformMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalContract, 0);
  if (total === 0) return 0;
  const received = records.reduce((acc, r) => acc + r.received, 0);
  return Math.round((received / total) * 10000) / 100;
}
