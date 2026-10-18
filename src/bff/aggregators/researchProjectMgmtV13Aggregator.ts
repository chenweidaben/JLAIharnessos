/**
 * 健澜科技 jlmedaios - 科研项目管理 V13 纯函数（M443-C，教学科研与继续教育管理组）
 *
 * computeResearchProjectApprovedCountV13 / computeResearchProjectFundingArrivalRateV13 / computeResearchProjectAchievementTransformCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 科研项目管理记录 */
export interface ResearchProjectMgmtRecordV13 {
  fundingArrived: number;
  shouldArrive: number;
  transformed: boolean;
}

/**
 * 立项项目数（纯函数，计数指标）：直接返回 records.length。
 *
 * @param records 科研项目管理记录列表
 * @returns 立项项目数（整数）
 */
export function computeResearchProjectApprovedCountV13(records: ResearchProjectMgmtRecordV13[]): number {
  return records.length;
}

/**
 * 经费到位率（纯函数）：已到位经费数/应到位经费总数×100，保留 2 位小数。
 *
 * @param records 科研项目管理记录列表
 * @returns 经费到位率百分比
 */
export function computeResearchProjectFundingArrivalRateV13(records: ResearchProjectMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldArrive, 0);
  if (total === 0) return 0;
  const arrived = records.reduce((acc, r) => acc + r.fundingArrived, 0);
  return Math.round((arrived / total) * 10000) / 100;
}

/**
 * 成果转化数（纯函数，计数指标）：返回已转化项目数（records.filter(r => r.transformed).length）。
 *
 * @param records 科研项目管理记录列表
 * @returns 成果转化数（整数）
 */
export function computeResearchProjectAchievementTransformCountV13(records: ResearchProjectMgmtRecordV13[]): number {
  return records.filter((r) => r.transformed).length;
}
