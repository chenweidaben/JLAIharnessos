/**
 * 健澜科技 jlmedaios - 质控 AI 相似病历推荐 V14 聚合器（M499-C）
 *
 * 纯函数：相似病历推荐 + 推荐报告构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 相似病历记录 */
export interface SimilarRecordV14 {
  id: string;
  dept: string;
  score: number;
}

/** 推荐报告 */
export interface SimilarReportV14 {
  records: SimilarRecordV14[];
  count: number;
}

/**
 * 推荐相似病历（排除自己后按 score 降序排列）。
 *
 * @param recordId 当前病历号
 * @param candidates 候选病历数组
 * @returns 相似病历数组
 */
export function recommendSimilar(
  recordId: string,
  candidates: { id: string; dept: string; score: number }[],
): SimilarRecordV14[] {
  // 手算推荐逻辑：排除自己（id === recordId）后按 score 降序排列
  const filtered = candidates.filter((c) => c.id !== recordId);
  return filtered.sort((a, b) => b.score - a.score);
}

/**
 * 构建推荐报告。
 *
 * @param records 相似病历数组
 * @returns 推荐报告（records 列表 + count）
 */
export function buildSimilarReport(records: SimilarRecordV14[]): SimilarReportV14 {
  // 手算 count：推荐列表的长度
  return {
    records,
    count: records.length,
  };
}
