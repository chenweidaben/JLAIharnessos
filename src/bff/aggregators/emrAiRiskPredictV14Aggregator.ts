/**
 * 健澜科技 jlmedaios - AI 病历风险预测 V14 聚合器（M486-C）
 *
 * 纯函数：风险预测 + 报告构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 风险预测结果 */
export interface AiRiskResultV14 {
  age: number;
  diseases: string[];
  symptoms: string[];
  riskLevel: "低" | "中" | "高";
}

/** AI 风险报告 */
export interface AiRiskReportV14 {
  riskLevel: "低" | "中" | "高";
  riskScore: number;
}

/**
 * 预测风险等级。
 *
 * @param data 风险因素
 * @returns 风险预测结果
 */
export function predictAiRisk(data: { age: number; diseases: string[]; symptoms: string[] }): AiRiskResultV14 {
  let riskLevel: "低" | "中" | "高" = "低";
  if (data.age >= 60 && data.diseases.length >= 2) {
    riskLevel = "高";
  } else if (data.age >= 40 || data.diseases.length >= 1) {
    riskLevel = "中";
  }
  if (data.symptoms.includes("胸痛")) {
    riskLevel = "高";
  }
  return { ...data, riskLevel };
}

/**
 * 构建风险报告：低=20 / 中=50 / 高=80。
 *
 * @param result 风险预测结果
 * @returns 报告
 */
export function buildRiskReport(result: AiRiskResultV14): AiRiskReportV14 {
  const riskScore = result.riskLevel === "高" ? 80 : result.riskLevel === "中" ? 50 : 20;
  return { riskLevel: result.riskLevel, riskScore };
}
