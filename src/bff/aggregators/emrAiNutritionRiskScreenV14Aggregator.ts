/**
 * 健澜科技 jlmedaios - 病历AI营养风险筛查 V14 聚合器（M564-A）
 *
 * 纯函数：构建 AI 营养风险筛查基础数据 + AI 营养风险筛查 + 构建营养风险筛查报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 营养风险筛查基础数据 */
export interface AiNutritionRiskScreenV14 {
  recordId: string;
  dept: string;
}

/** AI 营养风险筛查输入 */
export interface AiNutritionRiskScreenInputV14 {
  bmi: number;
  weightLoss: number;
  intakeReduced: number;
}

/** AI 营养风险筛查结果 */
export interface AiNutritionRiskScreenResultV14 {
  riskScore: number;
  riskLevel: string;
}

/** 营养风险筛查报告 */
export interface AiNutritionRiskScreenReportV14 {
  riskScore: number;
  riskLevel: string;
}

/**
 * 构建 AI 营养风险筛查基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 营养风险筛查基础数据
 */
export function buildAiNutritionRiskScreen(recordId: string, dept: string): AiNutritionRiskScreenV14 {
  return { recordId, dept };
}

/**
 * AI 营养风险筛查。
 * riskScore = (bmi < 18.5 ? 2 : 0)
 *   + (weightLoss > 5 ? 2 : 0) + (intakeReduced > 50 ? 2 : 0)
 * riskLevel = riskScore >= 4 ? '高风险'
 *   : riskScore >= 2 ? '中风险' : '低风险'
 *
 * @param input 营养风险筛查输入（BMI + 体重下降% + 进食减少%）
 * @returns 营养风险筛查结果（riskScore + riskLevel）
 */
export function screenNutritionRiskByAi(input: AiNutritionRiskScreenInputV14): AiNutritionRiskScreenResultV14 {
  // 手算：riskScore = (bmi<18.5?2:0) + (weightLoss>5?2:0) + (intakeReduced>50?2:0)
  // 测试2：bmi=17.0<18.5(2) + weightLoss=8>5(2) + intakeReduced=60>50(2) = 2+2+2 = 6
  // 测试3：bmi=22.0(0) + weightLoss=0(0) + intakeReduced=0(0) = 0+0+0 = 0
  const riskScore = (input.bmi < 18.5 ? 2 : 0)
    + (input.weightLoss > 5 ? 2 : 0)
    + (input.intakeReduced > 50 ? 2 : 0);
  // 手算：riskLevel = riskScore >= 4 ? '高风险'
  //   : riskScore >= 2 ? '中风险' : '低风险'
  // 测试2：riskScore=6 >= 4 → '高风险'
  // 测试3：riskScore=0 >= 2?... : '低风险' = '低风险'
  const riskLevel = riskScore >= 4 ? "高风险" : riskScore >= 2 ? "中风险" : "低风险";
  return { riskScore, riskLevel };
}

/**
 * 构建营养风险筛查报告。
 *
 * @param result 营养风险筛查结果
 * @returns 营养风险筛查报告（riskScore + riskLevel 透传）
 */
export function buildAiNutritionRiskScreenReport(result: AiNutritionRiskScreenResultV14): AiNutritionRiskScreenReportV14 {
  // 手算：透传 riskScore + riskLevel
  // 测试4：{riskScore=6, riskLevel='高风险'} → 透传
  return { riskScore: result.riskScore, riskLevel: result.riskLevel };
}
