/**
 * 健澜科技 jlmedaios - 智慧医院评级自评 V13 纯函数（M323-C）
 *
 * computeMedicalServiceScoreV13 / computeNursingMgmtScoreV13 / computeSmartMedicalScoreV13 / computeSmartHospitalOverallV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 智慧医院评估项 */
export interface SmartHospitalAssessmentV13 {
  dimension: "medicalService" | "nursingMgmt" | "smartMedical";
  score: number;
}

/**
 * 医疗服务维度得分（纯函数）：均值。
 *
 * @param assessments 评估项列表
 * @returns 平均得分（四舍五入）
 */
export function computeMedicalServiceScoreV13(assessments: SmartHospitalAssessmentV13[]): number {
  const items = assessments.filter((a) => a.dimension === "medicalService");
  if (items.length === 0) return 0;
  const sum = items.reduce((acc, a) => acc + a.score, 0);
  return Math.round(sum / items.length);
}

/**
 * 护理管理维度得分（纯函数）：均值。
 *
 * @param assessments 评估项列表
 * @returns 平均得分（四舍五入）
 */
export function computeNursingMgmtScoreV13(assessments: SmartHospitalAssessmentV13[]): number {
  const items = assessments.filter((a) => a.dimension === "nursingMgmt");
  if (items.length === 0) return 0;
  const sum = items.reduce((acc, a) => acc + a.score, 0);
  return Math.round(sum / items.length);
}

/**
 * 智慧医疗维度得分（纯函数）：均值。
 *
 * @param assessments 评估项列表
 * @returns 平均得分（四舍五入）
 */
export function computeSmartMedicalScoreV13(assessments: SmartHospitalAssessmentV13[]): number {
  const items = assessments.filter((a) => a.dimension === "smartMedical");
  if (items.length === 0) return 0;
  const sum = items.reduce((acc, a) => acc + a.score, 0);
  return Math.round(sum / items.length);
}

/**
 * 智慧医院总分（纯函数）：三维度加权平均。
 *
 * @param medicalScore 医疗服务得分
 * @param nursingScore 护理管理得分
 * @param smartScore 智慧医疗得分
 * @returns 总分（四舍五入）
 */
export function computeSmartHospitalOverallV13(medicalScore: number, nursingScore: number, smartScore: number): number {
  return Math.round((medicalScore + nursingScore + smartScore) / 3);
}
