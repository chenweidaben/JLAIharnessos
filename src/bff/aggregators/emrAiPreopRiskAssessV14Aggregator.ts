/**
 * 健澜科技 jlmedaios - 病历AI术前风险评估 V14 聚合器（M562-A，手术与麻醉管理系列）
 *
 * 纯函数：构建 AI 术前风险评估基础数据 + AI 术前风险评估 + 构建术前风险评估报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 术前风险评估基础数据 */
export interface AiPreopRiskAssessV14 {
  recordId: string;
  dept: string;
}

/** AI 术前风险评估输入 */
export interface AiPreopRiskAssessInputV14 {
  patientAge: number;
  hasHeartDisease: boolean;
  hasHypertension: boolean;
}

/** AI 术前风险评估结果 */
export interface AiPreopRiskAssessResultV14 {
  riskScore: number;
  riskLevel: string;
}

/** 术前风险评估报告 */
export interface AiPreopRiskAssessReportV14 {
  riskScore: number;
  riskLevel: string;
}

/**
 * 构建 AI 术前风险评估基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 术前风险评估基础数据
 */
export function buildAiPreopRiskAssess(recordId: string, dept: string): AiPreopRiskAssessV14 {
  return { recordId, dept };
}

/**
 * AI 术前风险评估。
 * riskScore = (patientAge >= 70 ? 25 : 0)
 *   + (hasHeartDisease ? 30 : 0) + (hasHypertension ? 15 : 0)
 * riskLevel = riskScore >= 50 ? '高风险' : riskScore >= 25 ? '中风险' : '低风险'
 *
 * @param input 术前风险评估输入（年龄 + 心脏病史 + 高血压史）
 * @returns 术前风险评估结果（riskScore + riskLevel）
 */
export function assessPreopRiskByAi(input: AiPreopRiskAssessInputV14): AiPreopRiskAssessResultV14 {
  // 手算：riskScore = (patientAge>=70?25:0) + (hasHeartDisease?30:0) + (hasHypertension?15:0)
  // 测试2：patientAge=75, hasHeartDisease=true, hasHypertension=true
  //   = 25 + 30 + 15 = 70
  // 测试3：patientAge=45, hasHeartDisease=false, hasHypertension=false
  //   = 0 + 0 + 0 = 0
  const riskScore = (input.patientAge >= 70 ? 25 : 0)
    + (input.hasHeartDisease ? 30 : 0)
    + (input.hasHypertension ? 15 : 0);
  // 手算：riskLevel = riskScore >= 50 ? '高风险' : riskScore >= 25 ? '中风险' : '低风险'
  // 测试2：riskScore=70 >= 50 → '高风险'
  // 测试3：riskScore=0 >= 25 ? ... : '低风险' = '低风险'
  const riskLevel = riskScore >= 50 ? "高风险" : riskScore >= 25 ? "中风险" : "低风险";
  return { riskScore, riskLevel };
}

/**
 * 构建术前风险评估报告。
 *
 * @param result 术前风险评估结果
 * @returns 术前风险评估报告（riskScore + riskLevel 透传）
 */
export function buildAiPreopRiskAssessReport(result: AiPreopRiskAssessResultV14): AiPreopRiskAssessReportV14 {
  // 手算：透传 riskScore + riskLevel
  // 测试4：{riskScore=70, riskLevel='高风险'} → 透传
  return { riskScore: result.riskScore, riskLevel: result.riskLevel };
}
