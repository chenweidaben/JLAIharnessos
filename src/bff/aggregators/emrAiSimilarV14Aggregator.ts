/**
 * 健澜科技 jlmedaios - AI 病历相似病历推荐 V14 聚合器（M486-D，M486 收官）
 *
 * 纯函数：相似病历查找 + 报告构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 相似病历结果 */
export interface AiSimilarResultV14 {
  currentDiagnosis: string;
  similarCases: { id: string; diagnosis: string; similarity: number }[];
}

/** AI 相似病历报告 */
export interface AiSimilarReportV14 {
  similarCount: number;
}

/**
 * 根据诊断匹配相似病历。
 *
 * @param currentDiagnosis 当前诊断
 * @param allCases 所有病历
 * @returns 相似病历结果
 */
export function findSimilarCases(currentDiagnosis: string, allCases: { id: string; diagnosis: string }[]): AiSimilarResultV14 {
  const similarCases = allCases
    .filter((c) => c.diagnosis === currentDiagnosis)
    .map((c) => ({ ...c, similarity: 90 }));
  return { currentDiagnosis, similarCases };
}

/**
 * 构建相似病历报告。
 *
 * @param result 相似病历结果
 * @returns 报告
 */
export function buildSimilarReport(result: AiSimilarResultV14): AiSimilarReportV14 {
  const similarCount = result.similarCases.length;
  return { similarCount };
}
