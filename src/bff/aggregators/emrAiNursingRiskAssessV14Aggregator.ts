/**
 * 健澜科技 jlmedaios - 病历AI护理风险评估 V14 聚合器（M557-C）
 *
 * 纯函数：构建 AI 护理风险评估基础数据 + AI 护理风险评估 + 构建护理风险评估报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 护理风险评估基础数据 */
export interface AiNursingRiskAssessV14 {
  recordId: string;
  dept: string;
}

/** AI 护理风险评估输入 */
export interface AiNursingRiskAssessInputV14 {
  age: number;
  hasFallHistory: boolean;
  hasPressureUlcer: boolean;
  isConfused: boolean;
}

/** AI 护理风险评估结果 */
export interface AiNursingRiskAssessResultV14 {
  riskLevel: string;
  riskScore: number;
}

/** 护理风险评估报告 */
export interface AiNursingRiskAssessReportV14 {
  riskLevel: string;
  riskScore: number;
}

/**
 * 构建 AI 护理风险评估基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 护理风险评估基础数据
 */
export function buildAiNursingRiskAssess(recordId: string, dept: string): AiNursingRiskAssessV14 {
  return { recordId, dept };
}

/**
 * AI 护理风险评估。
 * riskScore = (age >= 70 ? 20 : 0) + (hasFallHistory ? 30 : 0)
 *   + (hasPressureUlcer ? 25 : 0) + (isConfused ? 25 : 0)
 * riskLevel = riskScore >= 60 ? '高风险' : riskScore >= 30 ? '中风险' : '低风险'
 *
 * @param input 风险评估输入（年龄 + 跌倒史 + 压疮史 + 意识模糊）
 * @returns 风险评估结果（riskLevel + riskScore）
 */
export function assessNursingRiskByAi(input: AiNursingRiskAssessInputV14): AiNursingRiskAssessResultV14 {
  // 手算：riskScore = (age >= 70 ? 20 : 0) + (hasFallHistory ? 30 : 0)
  //   + (hasPressureUlcer ? 25 : 0) + (isConfused ? 25 : 0)
  // 测试2：age=75, hasFallHistory=true, hasPressureUlcer=true, isConfused=false
  //   = (75>=70?20:0) + 30 + 25 + 0 = 20+30+25+0 = 75
  // 测试3：age=40, hasFallHistory=false, hasPressureUlcer=false, isConfused=false
  //   = 0 + 0 + 0 + 0 = 0
  const riskScore = (input.age >= 70 ? 20 : 0)
    + (input.hasFallHistory ? 30 : 0)
    + (input.hasPressureUlcer ? 25 : 0)
    + (input.isConfused ? 25 : 0);
  // 手算：riskLevel = riskScore >= 60 ? '高风险' : riskScore >= 30 ? '中风险' : '低风险'
  // 测试2：riskScore=75 >= 60 → '高风险'
  // 测试3：riskScore=0 >= 30 ? ... : '低风险' = '低风险'
  const riskLevel = riskScore >= 60 ? "高风险" : riskScore >= 30 ? "中风险" : "低风险";
  return { riskLevel, riskScore };
}

/**
 * 构建护理风险评估报告。
 *
 * @param result 风险评估结果
 * @returns 风险评估报告（riskLevel + riskScore 透传）
 */
export function buildAiNursingRiskAssessReport(result: AiNursingRiskAssessResultV14): AiNursingRiskAssessReportV14 {
  // 手算：透传 riskLevel + riskScore
  // 测试4：{riskLevel='高风险', riskScore=75} → 透传
  return { riskLevel: result.riskLevel, riskScore: result.riskScore };
}
