/**
 * 健澜科技 jlmedaios - 病历AI院内感染风险预警 V14 聚合器（M559-C）
 *
 * 纯函数：构建 AI 院内感染风险预警基础数据 + AI 院内感染风险预警 + 构建院内感染风险预警报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 院内感染风险预警基础数据 */
export interface AiHaiRiskAlertV14 {
  recordId: string;
  dept: string;
}

/** AI 院内感染风险预警输入 */
export interface AiHaiRiskAlertInputV14 {
  hasSurgery: boolean;
  hasCatheter: boolean;
  hasImmunosuppressant: boolean;
  hospitalDays: number;
}

/** AI 院内感染风险预警结果 */
export interface AiHaiRiskAlertResultV14 {
  riskScore: number;
  riskLevel: string;
}

/** 院内感染风险预警报告 */
export interface AiHaiRiskAlertReportV14 {
  riskScore: number;
  riskLevel: string;
}

/**
 * 构建 AI 院内感染风险预警基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 院内感染风险预警基础数据
 */
export function buildAiHaiRiskAlert(recordId: string, dept: string): AiHaiRiskAlertV14 {
  return { recordId, dept };
}

/**
 * AI 院内感染风险预警。
 * riskScore = (hasSurgery?25:0) + (hasCatheter?20:0)
 *   + (hasImmunosuppressant?15:0) + (hospitalDays>=7?10:0)
 * riskLevel = riskScore >= 50 ? '高风险' : riskScore >= 25 ? '中风险' : '低风险'
 *
 * @param input 院内感染风险预警输入（手术/插管/免疫抑制剂/住院天数）
 * @returns 院内感染风险预警结果（riskScore + riskLevel）
 */
export function alertHaiRiskByAi(input: AiHaiRiskAlertInputV14): AiHaiRiskAlertResultV14 {
  // 手算：riskScore = (hasSurgery?25:0) + (hasCatheter?20:0)
  //   + (hasImmunosuppressant?15:0) + (hospitalDays>=7?10:0)
  // 测试2：hasSurgery=true, hasCatheter=true, hasImmunosuppressant=true, hospitalDays=10
  //   = 25+20+15+(10>=7?10:0) = 25+20+15+10 = 70
  // 测试3：hasSurgery=false, hasCatheter=false, hasImmunosuppressant=false, hospitalDays=3
  //   = 0+0+0+(3>=7?0:0) = 0
  const riskScore = (input.hasSurgery ? 25 : 0)
    + (input.hasCatheter ? 20 : 0)
    + (input.hasImmunosuppressant ? 15 : 0)
    + (input.hospitalDays >= 7 ? 10 : 0);
  // 手算：riskLevel = riskScore >= 50 ? '高风险' : riskScore >= 25 ? '中风险' : '低风险'
  // 测试2：riskScore=70 >= 50 → '高风险'
  // 测试3：riskScore=0 >= 25 ? ... : '低风险' = '低风险'
  const riskLevel = riskScore >= 50 ? "高风险" : riskScore >= 25 ? "中风险" : "低风险";
  return { riskScore, riskLevel };
}

/**
 * 构建院内感染风险预警报告。
 *
 * @param result 院内感染风险预警结果
 * @returns 院内感染风险预警报告（riskScore + riskLevel 透传）
 */
export function buildAiHaiRiskAlertReport(result: AiHaiRiskAlertResultV14): AiHaiRiskAlertReportV14 {
  // 手算：透传 riskScore + riskLevel
  // 测试4：{riskScore=70, riskLevel='高风险'} → 透传
  return { riskScore: result.riskScore, riskLevel: result.riskLevel };
}
