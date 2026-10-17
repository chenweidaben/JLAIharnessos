/**
 * 健澜科技 jlmedaios - 质量管理体系 V13 纯函数（M395-C）
 *
 * computeQualityCommitteeMeetingCountV13 / computeQualityObjectiveAchievementRateV13 / computeQualityImprovementProjectCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质量管理体系记录 */
export interface QualityMgmtSystemRecordV13 {
  meetingCount: number;
  achievedCount: number;
  totalCount: number;
  projectCount: number;
}

/**
 * 质量委员会会议次数（纯函数）：求和。
 *
 * @param records 质量管理体系记录列表
 * @returns 质量委员会会议次数
 */
export function computeQualityCommitteeMeetingCountV13(records: QualityMgmtSystemRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.meetingCount, 0);
}

/**
 * 质量目标达成率（纯函数）：已达成目标数/质量目标总数×100，保留 2 位小数。
 *
 * @param records 质量管理体系记录列表
 * @returns 质量目标达成率百分比
 */
export function computeQualityObjectiveAchievementRateV13(records: QualityMgmtSystemRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCount, 0);
  if (total === 0) return 0;
  const achieved = records.reduce((acc, r) => acc + r.achievedCount, 0);
  return Math.round((achieved / total) * 10000) / 100;
}

/**
 * 质量改进项目数（纯函数）：求和。
 *
 * @param records 质量管理体系记录列表
 * @returns 质量改进项目数
 */
export function computeQualityImprovementProjectCountV13(records: QualityMgmtSystemRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.projectCount, 0);
}
