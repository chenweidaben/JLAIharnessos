/**
 * 健澜科技 jlmedaios - NLP 病历相似度计算 V14 聚合器（M491-D，M491 收官）
 *
 * 纯函数：病历相似度计算 + 相似度报告构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 相似度结果 */
export interface NlpSimilarityResultV14 {
  similarityScore: number;
}

/** 相似度报告 */
export interface NlpSimilarityReportV14 {
  similarityScore: number;
}

/**
 * 计算两份病历相似度（简单字符匹配，Jaccard 风格）。
 *
 * @param textA 病历A
 * @param textB 病历B
 * @returns 相似度结果
 */
export function calculateMedicalSimilarity(textA: string, textB: string): NlpSimilarityResultV14 {
  if (!textA || !textB) {
    return { similarityScore: 0 };
  }
  // 手算：将文本拆成字符集合，计算交集/并集，映射到 0-100 整数
  const setA = new Set(textA.split(""));
  const setB = new Set(textB.split(""));
  let intersection = 0;
  for (const ch of setA) {
    if (setB.has(ch)) {
      intersection++;
    }
  }
  const union = setA.size + setB.size - intersection;
  const similarity = union === 0 ? 0 : Math.round((intersection / union) * 100);
  return { similarityScore: similarity };
}

/**
 * 构建相似度报告（similarityScore 0-100）。
 *
 * @param result 相似度结果
 * @returns 相似度报告
 */
export function buildSimilarityReport(result: NlpSimilarityResultV14): NlpSimilarityReportV14 {
  // 手算：similarityScore 直接透传
  return { similarityScore: result.similarityScore };
}
