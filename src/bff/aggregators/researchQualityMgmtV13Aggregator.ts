/**
 * 健澜科技 jlmedaios - 科研质量管理 V13 纯函数（M434-B，-quality 后缀避让教学科研相关旧版模块（M419 trainingMgmtDetailV13 等））
 *
 * computeResearchProjectCountV13 / computeResearchPaperCountV13 / computeResearchFundingArrivalRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 科研质量管理记录 */
export interface ResearchQualityMgmtRecordV13 {
  projectCount: number;
  paperCount: number;
  arrivedFunding: number;
  totalFunding: number;
}

/**
 * 科研项目数（纯函数，整数求和类，单位个）：对 projectCount 求和。
 *
 * @param records 科研质量管理记录列表
 * @returns 科研项目数（整数个）
 */
export function computeResearchProjectCountV13(records: ResearchQualityMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.projectCount, 0);
}

/**
 * 论文发表数（纯函数，整数求和类，单位篇）：对 paperCount 求和。
 *
 * @param records 科研质量管理记录列表
 * @returns 论文发表数（整数篇）
 */
export function computeResearchPaperCountV13(records: ResearchQualityMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.paperCount, 0);
}

/**
 * 科研经费到账率（纯函数）：到账经费数/立项经费总数×100，保留 2 位小数。
 *
 * @param records 科研质量管理记录列表
 * @returns 科研经费到账率百分比
 */
export function computeResearchFundingArrivalRateV13(records: ResearchQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalFunding, 0);
  if (total === 0) return 0;
  const arrived = records.reduce((acc, r) => acc + r.arrivedFunding, 0);
  return Math.round((arrived / total) * 10000) / 100;
}
