/**
 * 健澜科技 jlmedaios - 电子病历五级评级自评 V13 纯函数（M323-A）
 *
 * computeEmrDomainScoreV13 / computeEmrOverallScoreV13 / gradeEmrLevelV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** EMR 域评估项 */
export interface EmrAssessmentV13 {
  domain: "dataManagement" | "medicalQuality" | "operationManagement" | "dataUtilization" | "patientService" | "teachingResearch" | "managementDecision" | "security";
  score: number;
}

/** 域得分 */
export type EmrDomainScoreV13 = Record<EmrAssessmentV13["domain"], number>;

/**
 * 8 个域得分（纯函数）：各域得分均值。
 *
 * @param assessments 评估项列表
 * @returns 8 域得分
 */
export function computeEmrDomainScoreV13(assessments: EmrAssessmentV13[]): EmrDomainScoreV13 {
  const domains: EmrAssessmentV13["domain"][] = [
    "dataManagement", "medicalQuality", "operationManagement", "dataUtilization",
    "patientService", "teachingResearch", "managementDecision", "security",
  ];
  const result = {} as EmrDomainScoreV13;
  for (const d of domains) {
    const items = assessments.filter((a) => a.domain === d);
    if (items.length === 0) {
      result[d] = 0;
    } else {
      const sum = items.reduce((acc, a) => acc + a.score, 0);
      result[d] = Math.round(sum / items.length);
    }
  }
  return result;
}

/**
 * 总分（纯函数）：8 域加权平均。
 *
 * @param domainScores 域得分
 * @returns 总分（四舍五入）
 */
export function computeEmrOverallScoreV13(domainScores: EmrDomainScoreV13): number {
  const values = Object.values(domainScores);
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return Math.round(sum / values.length);
}

/**
 * 评级判定（纯函数）：≥90=五级，80-89=四级，70-79=三级，<70=未达标。
 *
 * @param overallScore 总分
 * @returns 评级
 */
export function gradeEmrLevelV13(overallScore: number): "五级" | "四级" | "三级" | "未达标" {
  if (overallScore >= 90) return "五级";
  if (overallScore >= 80) return "四级";
  if (overallScore >= 70) return "三级";
  return "未达标";
}
