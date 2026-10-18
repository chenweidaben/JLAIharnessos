/**
 * 健澜科技 jlmedaios - 病历AI质控风险评分 V14 聚合器（M549-C）
 *
 * 纯函数：构建 AI 风险评分基础数据 + AI 风险评分 + 构建风险评分报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 风险评分基础数据 */
export interface AiQcRiskScoreV14 {
  recordId: string;
  dept: string;
}

/** AI 风险评分输入 */
export interface AiQcRiskScoreInputV14 {
  blockCount: number;
  majorCount: number;
  minorCount: number;
}

/** AI 风险评分结果 */
export interface AiQcRiskScoreResultV14 {
  riskScore: number;
  riskLevel: string;
}

/** 风险评分报告 */
export interface AiQcRiskScoreReportV14 {
  riskScore: number;
  riskLevel: string;
}

/**
 * 构建 AI 风险评分基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 风险评分基础数据
 */
export function buildAiQcRiskScore(recordId: string, dept: string): AiQcRiskScoreV14 {
  return { recordId, dept };
}

/**
 * AI 风险评分。
 * riskScore = Math.min(100, blockCount * 15 + majorCount * 8 + minorCount * 3)
 * riskLevel = riskScore >= 60 ? '高风险' : riskScore >= 30 ? '中风险' : '低风险'
 *
 * @param input 风险评分输入（阻断项数 + 主要缺陷数 + 次要缺陷数）
 * @returns 风险评分结果（riskScore + riskLevel）
 */
export function scoreQcRiskByAi(input: AiQcRiskScoreInputV14): AiQcRiskScoreResultV14 {
  // 手算：riskScore = Math.min(100, blockCount * 15 + majorCount * 8 + minorCount * 3)
  // 测试2：blockCount=2, majorCount=3, minorCount=5 → 2*15+3*8+5*3 = 30+24+15 = 69 → Math.min(100, 69) = 69
  // 测试3：blockCount=0, majorCount=0, minorCount=2 → 0+0+2*3 = 6 → Math.min(100, 6) = 6
  const riskScore = Math.min(100, input.blockCount * 15 + input.majorCount * 8 + input.minorCount * 3);
  // 手算：riskLevel = riskScore >= 60 ? '高风险' : riskScore >= 30 ? '中风险' : '低风险'
  // 测试2：riskScore=69 → 69>=60 → riskLevel='高风险'
  // 测试3：riskScore=6 → 6<30 → riskLevel='低风险'
  const riskLevel = riskScore >= 60 ? "高风险" : riskScore >= 30 ? "中风险" : "低风险";
  return { riskScore, riskLevel };
}

/**
 * 构建风险评分报告。
 *
 * @param result 风险评分结果
 * @returns 风险评分报告（riskScore + riskLevel 透传）
 */
export function buildAiQcRiskScoreReport(result: AiQcRiskScoreResultV14): AiQcRiskScoreReportV14 {
  // 手算：透传 riskScore + riskLevel
  // 测试4：{riskScore=69, riskLevel='高风险'} → 透传
  return { riskScore: result.riskScore, riskLevel: result.riskLevel };
}
