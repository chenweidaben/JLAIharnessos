/**
 * 健澜科技 jlmedaios - 31 天再入院风险预测 V13 纯函数（M314-B）
 *
 * computeReadmissionRiskScoreV13 / classifyReadmissionRiskV13 / identifyHighRiskPatientsV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 再入院风险患者 */
export interface ReadmissionPatientV13 {
  patientId: string;
  age: number;
  comorbidityCount: number;
  losDays: number;
}

/** 年龄权重 */
export const AGE_WEIGHT_V13 = 0.5;

/** 合并症权重 */
export const COMORBIDITY_WEIGHT_V13 = 10;

/** 住院天数权重 */
export const LOS_WEIGHT_V13 = 2;

/**
 * 风险分（纯函数）：年龄权重×年龄 + 合并症数×10 + 住院天数×2，0-100 截断。
 *
 * @param patient 患者
 * @returns 风险分
 */
export function computeReadmissionRiskScoreV13(patient: ReadmissionPatientV13): number {
  const raw =
    AGE_WEIGHT_V13 * patient.age +
    COMORBIDITY_WEIGHT_V13 * patient.comorbidityCount +
    LOS_WEIGHT_V13 * patient.losDays;
  if (raw < 0) return 0;
  if (raw > 100) return 100;
  return Math.round(raw);
}

/**
 * 风险等级（纯函数）：≥70 高 / 40-70 中 / <40 低。
 *
 * @param score 风险分
 * @returns 等级
 */
export function classifyReadmissionRiskV13(score: number): string {
  if (score >= 70) return "高";
  if (score >= 40) return "中";
  return "低";
}

/**
 * 高风险患者列表（纯函数）：score≥70。
 *
 * @param patients 患者列表
 * @returns 高风险患者
 */
export function identifyHighRiskPatientsV13(patients: ReadmissionPatientV13[]): ReadmissionPatientV13[] {
  return patients.filter((p) => computeReadmissionRiskScoreV13(p) >= 70);
}
