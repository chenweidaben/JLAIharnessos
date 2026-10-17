/**
 * 健澜科技 jlmedaios - 患者满意度调研 V13 纯函数（M332-A）
 *
 * computeOverallScoreV13 / computeDimensionScoresV13 / classifyComplaintReasonsV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 患者满意度调研 */
export interface PatientSurveyV13 {
  overallScore: number;
  medicalTech: number;
  serviceAttitude: number;
  environment: number;
  waitTime: number;
  complaintReason: string;
}

/** 维度评分项 */
export interface DimensionScoreV13 {
  dimension: string;
  score: number;
}

/** 不满意原因分布项 */
export interface ComplaintReasonCountV13 {
  reason: string;
  count: number;
}

/**
 * 总体满意度评分（纯函数）：均值，1-5 分制，保留 1 位小数。
 *
 * @param surveys 调研列表
 * @returns 总体评分
 */
export function computeOverallScoreV13(surveys: PatientSurveyV13[]): number {
  if (surveys.length === 0) return 0;
  const total = surveys.reduce((acc, s) => acc + s.overallScore, 0);
  return Math.round((total / surveys.length) * 10) / 10;
}

/**
 * 各维度评分（纯函数）：医疗技术/服务态度/就医环境/等待时间 各维度均值。
 *
 * @param surveys 调研列表
 * @returns 各维度评分
 */
export function computeDimensionScoresV13(surveys: PatientSurveyV13[]): DimensionScoreV13[] {
  if (surveys.length === 0) return [];
  const avg = (getter: (s: PatientSurveyV13) => number): number => {
    const total = surveys.reduce((acc, s) => acc + getter(s), 0);
    return Math.round((total / surveys.length) * 10) / 10;
  };
  return [
    { dimension: "医疗技术", score: avg((s) => s.medicalTech) },
    { dimension: "服务态度", score: avg((s) => s.serviceAttitude) },
    { dimension: "就医环境", score: avg((s) => s.environment) },
    { dimension: "等待时间", score: avg((s) => s.waitTime) },
  ];
}

/**
 * 不满意原因分布（纯函数）：分组计数。
 *
 * @param surveys 调研列表
 * @returns 各原因计数
 */
export function classifyComplaintReasonsV13(surveys: PatientSurveyV13[]): ComplaintReasonCountV13[] {
  const map = new Map<string, number>();
  for (const s of surveys) {
    if (!s.complaintReason) continue;
    map.set(s.complaintReason, (map.get(s.complaintReason) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([reason, count]) => ({ reason, count }));
}
