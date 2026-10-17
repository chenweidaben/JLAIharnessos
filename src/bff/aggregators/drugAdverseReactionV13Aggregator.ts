/**
 * 健澜科技 jlmedaios - 药品不良反应 V13 纯函数（M368-A）
 *
 * computeAdrReportCountV13 / computeSeriousAdrCountV13 / computeAdrReportTimelyRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 药品不良反应记录 */
export interface DrugAdverseReactionRecordV13 {
  adrReportCount: number;
  seriousAdrCount: number;
  timelyReportCount: number;
}

/**
 * ADR 报告数（纯函数）：求和。
 *
 * @param records 药品不良反应记录列表
 * @returns ADR 报告数
 */
export function computeAdrReportCountV13(records: DrugAdverseReactionRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.adrReportCount, 0);
}

/**
 * 严重 ADR 数（纯函数）：求和。
 *
 * @param records 药品不良反应记录列表
 * @returns 严重 ADR 数
 */
export function computeSeriousAdrCountV13(records: DrugAdverseReactionRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.seriousAdrCount, 0);
}

/**
 * ADR 报告及时率（纯函数）：及时报告数/报告总数×100，保留 2 位小数。
 *
 * @param records 药品不良反应记录列表
 * @returns ADR 报告及时率百分比
 */
export function computeAdrReportTimelyRateV13(records: DrugAdverseReactionRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.adrReportCount, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timelyReportCount, 0);
  return Math.round((timely / total) * 10000) / 100;
}
