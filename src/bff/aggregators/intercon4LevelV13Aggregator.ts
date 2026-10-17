/**
 * 健澜科技 jlmedaios - 互联互通四甲自评 V13 纯函数（M323-B）
 *
 * computePlatformStandardScoreV13 / computeInfoSharingScoreV13 / computeBusinessCollabScoreV13 / computeInterconOverallV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 互联互通评估项 */
export interface InterconAssessmentV13 {
  dimension: "platformStandard" | "infoSharing" | "businessCollab";
  score: number;
}

/**
 * 平台标准化得分（纯函数）：均值。
 *
 * @param assessments 评估项列表
 * @returns 平均得分（四舍五入）
 */
export function computePlatformStandardScoreV13(assessments: InterconAssessmentV13[]): number {
  const items = assessments.filter((a) => a.dimension === "platformStandard");
  if (items.length === 0) return 0;
  const sum = items.reduce((acc, a) => acc + a.score, 0);
  return Math.round(sum / items.length);
}

/**
 * 信息共享得分（纯函数）：均值。
 *
 * @param assessments 评估项列表
 * @returns 平均得分（四舍五入）
 */
export function computeInfoSharingScoreV13(assessments: InterconAssessmentV13[]): number {
  const items = assessments.filter((a) => a.dimension === "infoSharing");
  if (items.length === 0) return 0;
  const sum = items.reduce((acc, a) => acc + a.score, 0);
  return Math.round(sum / items.length);
}

/**
 * 业务协同得分（纯函数）：均值。
 *
 * @param assessments 评估项列表
 * @returns 平均得分（四舍五入）
 */
export function computeBusinessCollabScoreV13(assessments: InterconAssessmentV13[]): number {
  const items = assessments.filter((a) => a.dimension === "businessCollab");
  if (items.length === 0) return 0;
  const sum = items.reduce((acc, a) => acc + a.score, 0);
  return Math.round(sum / items.length);
}

/**
 * 互联互通总分（纯函数）：三维度加权平均。
 *
 * @param platformScore 平台标准化得分
 * @param infoScore 信息共享得分
 * @param collabScore 业务协同得分
 * @returns 总分（四舍五入）
 */
export function computeInterconOverallV13(platformScore: number, infoScore: number, collabScore: number): number {
  return Math.round((platformScore + infoScore + collabScore) / 3);
}
