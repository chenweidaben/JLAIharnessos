/**
 * 健澜科技 jlmedaios - 科研项目统计 V13 纯函数（M383-A，stats 避让）
 *
 * computeActiveResearchProjectCountV13 / computeResearchFundingAmountV13 / computeAnnualPaperCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 科研项目统计记录 */
export interface ResearchProjectRecordV13 {
  activeProjectCount: number;
  fundingAmount: number;
  annualPaperCount: number;
}

/**
 * 在研课题数（纯函数）：求和。
 *
 * @param records 科研项目统计记录列表
 * @returns 在研课题数
 */
export function computeActiveResearchProjectCountV13(records: ResearchProjectRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.activeProjectCount, 0);
}

/**
 * 科研经费到账金额（纯函数）：求和，单位万元。
 *
 * @param records 科研项目统计记录列表
 * @returns 科研经费到账金额
 */
export function computeResearchFundingAmountV13(records: ResearchProjectRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.fundingAmount, 0);
}

/**
 * 年度论文发表数（纯函数）：求和。
 *
 * @param records 科研项目统计记录列表
 * @returns 年度论文发表数
 */
export function computeAnnualPaperCountV13(records: ResearchProjectRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.annualPaperCount, 0);
}
