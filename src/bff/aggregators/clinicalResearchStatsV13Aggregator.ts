/**
 * 健澜科技 jlmedaios - 临床研究 V13 纯函数（M355-B，stats 避让已有 clinicalResearchV13）
 *
 * computeGcpProjectCountV13 / computeEthicsReviewCountV13 / computeSciPaperCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 临床研究统计记录 */
export interface ClinicalResearchStatsRecordV13 {
  gcpProjectCount: number;
  ethicsReviewCount: number;
  sciPaperCount: number;
}

/**
 * GCP 在研项目数（纯函数）：求和。
 *
 * @param records 临床研究统计记录列表
 * @returns GCP 在研项目数
 */
export function computeGcpProjectCountV13(records: ClinicalResearchStatsRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.gcpProjectCount, 0);
}

/**
 * 年度伦理审查数（纯函数）：求和。
 *
 * @param records 临床研究统计记录列表
 * @returns 年度伦理审查数
 */
export function computeEthicsReviewCountV13(records: ClinicalResearchStatsRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.ethicsReviewCount, 0);
}

/**
 * SCI 论文产出数（纯函数）：求和。
 *
 * @param records 临床研究统计记录列表
 * @returns SCI 论文产出数
 */
export function computeSciPaperCountV13(records: ClinicalResearchStatsRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.sciPaperCount, 0);
}
