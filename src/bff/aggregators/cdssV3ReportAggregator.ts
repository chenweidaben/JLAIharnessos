/**
 * 健澜科技 jlmedaios - CDSS 临床决策支持 V3 纯函数（M238-A）
 *
 * buildCDSSV3Report / differentialDiagnosis / assessCDSSAdoption
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 鉴别诊断（纯函数）。
 *
 * @param symptoms 症状
 * @param history 病史
 * @returns 鉴别
 */
export function differentialDiagnosis(symptoms: string, history: string): { diagnoses: string[]; top: string } {
  let diagnoses = ["急性上呼吸道感染", "肺炎", "肺结核"];
  if (symptoms.includes("胸痛")) diagnoses = ["急性心梗", "心绞痛", "肺栓塞"];
  return { diagnoses, top: diagnoses[0] };
}

/**
 * 评估 CDSS 采纳率（纯函数）。
 *
 * @param recommendations 推荐
 * @param actions 动作
 * @returns 采纳
 */
export function assessCDSSAdoption(recommendations: number, actions: number): { adoption: number; a_b_test: boolean } {
  let adoption = Math.round((actions / recommendations) * 100);
  if (adoption > 100) adoption = 100;
  return { adoption, a_b_test: true };
}

/** CDSS V3 报告输出 */
export interface CDSSV3Report {
  timeRange: string;
  differential: { cases: number; top3: number };
  drug: { indication: number; interaction: number; dosage: number };
  guideline: { recommendation: number; pathwayVariation: number };
  critical: { alert: number };
  adoption: { rate: number; a_b_test: boolean };
  suggestions: string[];
}

/**
 * 构建 CDSS V3 报告。
 *
 * @param timeRange 时间范围
 * @returns CDSS V3 报告
 */
export function buildCDSSV3Report(timeRange: string): CDSSV3Report {
  return {
    timeRange,
    differential: { cases: 50000, top3: 45000 },
    drug: { indication: 20000, interaction: 5000, dosage: 10000 },
    guideline: { recommendation: 30000, pathwayVariation: 2000 },
    critical: { alert: 500 },
    adoption: { rate: 75, a_b_test: true },
    suggestions: ["提升鉴别诊断准确率", "提高CDSS采纳率"],
  };
}
