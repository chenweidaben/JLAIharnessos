/**
 * 健澜科技 jlmedaios - 出院小结质量评分 V13 纯函数（M314-D）
 *
 * computeSummaryQualityScoreV13 / gradeSummaryQualityV13 / identifySummaryDeficiencyV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 出院小结四维分 */
export interface DischargeSummaryV13 {
  completeness: number;
  wordCount: number;
  icdCompleteness: number;
  medConsistency: number;
}

/** 权重 */
export const W_COMPLETENESS_V13 = 0.3;
export const W_WORDCOUNT_V13 = 0.2;
export const W_ICD_V13 = 0.3;
export const W_MEDCONSISTENCY_V13 = 0.2;

/**
 * 质量分（纯函数）：必填完整度×0.3 + 字数×0.2 + ICD×0.3 + 用药×0.2。
 *
 * @param summary 四维分
 * @returns 综合分
 */
export function computeSummaryQualityScoreV13(summary: DischargeSummaryV13): number {
  const raw =
    W_COMPLETENESS_V13 * summary.completeness +
    W_WORDCOUNT_V13 * summary.wordCount +
    W_ICD_V13 * summary.icdCompleteness +
    W_MEDCONSISTENCY_V13 * summary.medConsistency;
  return Math.round(raw * 10) / 10;
}

/**
 * 等级（纯函数）：≥85 优 / 70-85 良 / <70 待改进。
 *
 * @param score 综合分
 * @returns 等级
 */
export function gradeSummaryQualityV13(score: number): string {
  if (score >= 85) return "优";
  if (score >= 70) return "良";
  return "待改进";
}

/**
 * 缺陷维度（纯函数）：得分最低维度列出。
 *
 * @param score 综合分（保留参数兼容）
 * @param dims 四维分
 * @returns 缺陷维度名列表
 */
export function identifySummaryDeficiencyV13(
  score: number,
  dims: DischargeSummaryV13,
): string[] {
  void score;
  const entries: [string, number][] = [
    ["必填完整度", dims.completeness],
    ["字数", dims.wordCount],
    ["ICD编码完整度", dims.icdCompleteness],
    ["用药一致性", dims.medConsistency],
  ];
  const min = Math.min(...entries.map(([, v]) => v));
  return entries.filter(([, v]) => v === min).map(([name]) => name);
}
