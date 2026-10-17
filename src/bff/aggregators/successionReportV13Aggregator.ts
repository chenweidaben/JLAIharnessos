/**
 * 健澜科技 jlmedaios - 传承效果度量与院长报告 V13 纯函数（M297-D）
 *
 * measureHandoverEffectV13 / computeKnowledgeContinuityV13 / buildSuccessionReportV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 学习计划（最小字段） */
export interface StudyPlanMiniV13 {
  totalItems: number;
  studiedItems: number;
  avgStudyScore: number;
}

/** 复用日志 */
export interface ReuseLogV13 {
  reuseId: string;
  experienceId: string;
}

/** 传承效果 */
export interface HandoverEffectV13 {
  studyCompletionRate: number;
  reuseCount: number;
  avgStudyScore: number;
}

/** 诊疗质量分（前后任） */
export interface QualityCaseV13 {
  caseId: string;
  qualityScore: number;
}

/** 院长报告 */
export interface SuccessionReportV13 {
  overallScore: number;
  riskLevel: "low" | "mid" | "high";
  summary: string;
}

/**
 * 传承效果度量（纯函数）：完成率=studied/total*100，保留1位。
 *
 * @param plan 学习计划
 * @param reuseLogs 复用日志
 * @returns 效果
 */
export function measureHandoverEffectV13(
  plan: StudyPlanMiniV13,
  reuseLogs: ReuseLogV13[],
): HandoverEffectV13 {
  const rate = plan.totalItems === 0 ? 0 : Math.round((plan.studiedItems / plan.totalItems) * 1000) / 10;
  return {
    studyCompletionRate: rate,
    reuseCount: reuseLogs.length,
    avgStudyScore: plan.avgStudyScore,
  };
}

/**
 * 知识连续性（纯函数）：|newAvg - prevAvg| 越小越接近，100 - 差值（clamp 0-100）。
 *
 * @param prevCases 前任病例
 * @param newCases 继任者病例
 * @returns 连续性分
 */
export function computeKnowledgeContinuityV13(
  prevCases: QualityCaseV13[],
  newCases: QualityCaseV13[],
): number {
  if (prevCases.length === 0 || newCases.length === 0) return 0;
  const prevAvg = prevCases.reduce((s, c) => s + c.qualityScore, 0) / prevCases.length;
  const newAvg = newCases.reduce((s, c) => s + c.qualityScore, 0) / newCases.length;
  const diff = Math.abs(prevAvg - newAvg);
  return Math.max(0, Math.round(100 - diff));
}

/**
 * 院长报告（纯函数）：overall = 完成率*0.5 + 连续性*0.5；≥80 low / 60-79 mid / <60 high。
 *
 * @param effect 效果
 * @param continuityScore 连续性分
 * @returns 报告
 */
export function buildSuccessionReportV13(
  effect: HandoverEffectV13,
  continuityScore: number,
): SuccessionReportV13 {
  const overall = Math.round(effect.studyCompletionRate * 0.5 + continuityScore * 0.5);
  let riskLevel: SuccessionReportV13["riskLevel"] = "high";
  if (overall >= 80) riskLevel = "low";
  else if (overall >= 60) riskLevel = "mid";
  return {
    overallScore: overall,
    riskLevel,
    summary: `学习完成率 ${effect.studyCompletionRate}%，复用 ${effect.reuseCount} 次，连续性 ${continuityScore} 分`,
  };
}
