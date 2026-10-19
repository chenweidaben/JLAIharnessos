/**
 * 健澜科技 jlmedaios - 病历AI术前评估 V14 聚合器（M555-A）
 *
 * 纯函数：构建 AI 术前评估基础数据 + AI 术前评估 + 构建术前评估报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 术前评估基础数据 */
export interface AiPreopAssessmentV14 {
  recordId: string;
  dept: string;
}

/** AI 术前评估输入 */
export interface AiPreopAssessmentInputV14 {
  patientAge: number;
  hasHeartDisease: boolean;
  hasDiabetes: boolean;
}

/** AI 术前评估结果 */
export interface AiPreopAssessmentResultV14 {
  riskLevel: string;
  canOperate: boolean;
}

/** 术前评估报告 */
export interface AiPreopAssessmentReportV14 {
  riskLevel: string;
  canOperate: boolean;
}

/**
 * 构建 AI 术前评估基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 术前评估基础数据
 */
export function buildAiPreopAssessment(recordId: string, dept: string): AiPreopAssessmentV14 {
  return { recordId, dept };
}

/**
 * AI 术前评估。
 * riskLevel = (patientAge >= 70 || hasHeartDisease)
 *   ? (hasDiabetes ? '高危' : '中危')
 *   : '低危'
 * canOperate = riskLevel !== '高危'
 *
 * @param input 术前评估输入（患者年龄 + 心脏病史 + 糖尿病史）
 * @returns 术前评估结果（riskLevel + canOperate）
 */
export function assessPreopByAi(input: AiPreopAssessmentInputV14): AiPreopAssessmentResultV14 {
  // 手算：riskLevel = (patientAge >= 70 || hasHeartDisease)
  //   ? (hasDiabetes ? '高危' : '中危')
  //   : '低危'
  // 测试2：patientAge=45, hasHeartDisease=false, hasDiabetes=false → (false || false)=false → riskLevel='低危'
  // 测试3：patientAge=75, hasHeartDisease=true, hasDiabetes=true → (true || true)=true, hasDiabetes=true → riskLevel='高危'
  const riskLevel = (input.patientAge >= 70 || input.hasHeartDisease)
    ? (input.hasDiabetes ? "高危" : "中危")
    : "低危";
  // 手算：canOperate = riskLevel !== '高危'
  // 测试2：riskLevel='低危' → canOperate=true
  // 测试3：riskLevel='高危' → canOperate=false
  const canOperate = riskLevel !== "高危";
  return { riskLevel, canOperate };
}

/**
 * 构建术前评估报告。
 *
 * @param result 术前评估结果
 * @returns 术前评估报告（riskLevel + canOperate 透传）
 */
export function buildAiPreopAssessmentReport(result: AiPreopAssessmentResultV14): AiPreopAssessmentReportV14 {
  // 手算：透传 riskLevel + canOperate
  // 测试4：{riskLevel='低危', canOperate=true} → 透传
  return { riskLevel: result.riskLevel, canOperate: result.canOperate };
}
