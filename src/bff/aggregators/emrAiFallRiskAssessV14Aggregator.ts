/**
 * 健澜科技 jlmedaios - 病历AI患者跌倒风险评估 V14 聚合器（M559-D，M559 收官）
 *
 * 纯函数：构建 AI 患者跌倒风险评估基础数据 + AI 患者跌倒风险评估 + 构建跌倒风险评估报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 患者跌倒风险评估基础数据 */
export interface AiFallRiskAssessV14 {
  recordId: string;
  dept: string;
}

/** AI 患者跌倒风险评估输入 */
export interface AiFallRiskAssessInputV14 {
  age: number;
  hasDizziness: boolean;
  hasGaitInstability: boolean;
  sedativeUse: boolean;
}

/** AI 患者跌倒风险评估结果 */
export interface AiFallRiskAssessResultV14 {
  riskScore: number;
  riskLevel: string;
}

/** 跌倒风险评估报告 */
export interface AiFallRiskAssessReportV14 {
  riskScore: number;
  riskLevel: string;
}

/**
 * 构建 AI 患者跌倒风险评估基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 患者跌倒风险评估基础数据
 */
export function buildAiFallRiskAssess(recordId: string, dept: string): AiFallRiskAssessV14 {
  return { recordId, dept };
}

/**
 * AI 患者跌倒风险评估。
 * riskScore = (age>=70?30:0) + (hasDizziness?25:0)
 *   + (hasGaitInstability?25:0) + (sedativeUse?20:0)
 * riskLevel = riskScore >= 60 ? '高跌倒风险' : riskScore >= 30 ? '中跌倒风险' : '低跌倒风险'
 *
 * @param input 跌倒风险评估输入（年龄 + 头晕 + 步态不稳 + 镇静剂使用）
 * @returns 跌倒风险评估结果（riskScore + riskLevel）
 */
export function assessFallRiskByAi(input: AiFallRiskAssessInputV14): AiFallRiskAssessResultV14 {
  // 手算：riskScore = (age>=70?30:0) + (hasDizziness?25:0)
  //   + (hasGaitInstability?25:0) + (sedativeUse?20:0)
  // 测试2：age=75, hasDizziness=true, hasGaitInstability=true, sedativeUse=false
  //   = (75>=70?30:0) + 25 + 25 + 0 = 30+25+25+0 = 80
  // 测试3：age=40, hasDizziness=false, hasGaitInstability=false, sedativeUse=false
  //   = 0+0+0+0 = 0
  const riskScore = (input.age >= 70 ? 30 : 0)
    + (input.hasDizziness ? 25 : 0)
    + (input.hasGaitInstability ? 25 : 0)
    + (input.sedativeUse ? 20 : 0);
  // 手算：riskLevel = riskScore >= 60 ? '高跌倒风险' : riskScore >= 30 ? '中跌倒风险' : '低跌倒风险'
  // 测试2：riskScore=80 >= 60 → '高跌倒风险'
  // 测试3：riskScore=0 >= 30 ? ... : '低跌倒风险' = '低跌倒风险'
  const riskLevel = riskScore >= 60 ? "高跌倒风险" : riskScore >= 30 ? "中跌倒风险" : "低跌倒风险";
  return { riskScore, riskLevel };
}

/**
 * 构建跌倒风险评估报告。
 *
 * @param result 跌倒风险评估结果
 * @returns 跌倒风险评估报告（riskScore + riskLevel 透传）
 */
export function buildAiFallRiskAssessReport(result: AiFallRiskAssessResultV14): AiFallRiskAssessReportV14 {
  // 手算：透传 riskScore + riskLevel
  // 测试4：{riskScore=80, riskLevel='高跌倒风险'} → 透传
  return { riskScore: result.riskScore, riskLevel: result.riskLevel };
}
