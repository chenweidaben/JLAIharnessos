/**
 * 健澜科技 jlmedaios - 临床研究明细 V13 纯函数（M397-C，避让旧版 clinicalResearchV13/clinicalResearchStatsV13）
 *
 * computeClinicalTrialProjectCountV13 / computeInvestigatorInitiatedResearchCountV13 / computeEthicsReviewProjectCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 临床研究明细记录 */
export interface ClinicalResearchDetailRecordV13 {
  trialCount: number;
  investigatorCount: number;
  ethicsCount: number;
}

/**
 * 临床试验项目数（纯函数）：求和。
 *
 * @param records 临床研究明细记录列表
 * @returns 临床试验项目数
 */
export function computeClinicalTrialProjectCountV13(records: ClinicalResearchDetailRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.trialCount, 0);
}

/**
 * 研究者发起临床研究数（纯函数）：求和。
 *
 * @param records 临床研究明细记录列表
 * @returns 研究者发起临床研究数
 */
export function computeInvestigatorInitiatedResearchCountV13(records: ClinicalResearchDetailRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.investigatorCount, 0);
}

/**
 * 伦理审查项目数（纯函数）：求和。
 *
 * @param records 临床研究明细记录列表
 * @returns 伦理审查项目数
 */
export function computeEthicsReviewProjectCountV13(records: ClinicalResearchDetailRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.ethicsCount, 0);
}
