/**
 * 健澜科技 jlmedaios - 病历AI缺陷预测 V14 聚合器（M543-C）
 *
 * 纯函数：构建 AI 缺陷预测基础数据 + AI 缺陷预测 + 构建预测报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 缺陷预测基础数据 */
export interface AiDefectPredictV14 {
  recordId: string;
  dept: string;
}

/** AI 缺陷预测输入 */
export interface AiDefectPredictInputV14 {
  recordType: string;
  hasSignature: boolean;
  hasDischarge: boolean;
}

/** AI 缺陷预测结果 */
export interface AiDefectPredictResultV14 {
  riskLevel: string;
  predictedDefects: number;
}

/** 预测报告 */
export interface AiDefectPredictReportV14 {
  riskLevel: string;
  predictedDefects: number;
}

/**
 * 构建 AI 缺陷预测基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 缺陷预测基础数据
 */
export function buildAiDefectPredict(recordId: string, dept: string): AiDefectPredictV14 {
  return { recordId, dept };
}

/**
 * AI 缺陷预测。
 * riskLevel = !hasSignature ? '高' : !hasDischarge ? '中' : '低'
 * predictedDefects = (!hasSignature ? 1 : 0) + (!hasDischarge ? 1 : 0)
 *
 * @param input 预测输入（病历类型 + 是否签名 + 是否有出院小结）
 * @returns 预测结果（riskLevel + predictedDefects）
 */
export function predictDefectByAi(input: AiDefectPredictInputV14): AiDefectPredictResultV14 {
  // 手算：riskLevel = !hasSignature ? '高' : !hasDischarge ? '中' : '低'
  // 测试2：hasSignature=false → !hasSignature=true → riskLevel='高'
  // 测试3：hasSignature=true, hasDischarge=true → !hasSignature=false, !hasDischarge=false → riskLevel='低'
  const riskLevel = !input.hasSignature ? "高" : !input.hasDischarge ? "中" : "低";
  // 手算：predictedDefects = (!hasSignature ? 1 : 0) + (!hasDischarge ? 1 : 0)
  // 测试2：hasSignature=false → 1；hasDischarge=true → 0 → predictedDefects=1+0=1
  // 测试3：hasSignature=true → 0；hasDischarge=true → 0 → predictedDefects=0+0=0
  const predictedDefects = (!input.hasSignature ? 1 : 0) + (!input.hasDischarge ? 1 : 0);
  return { riskLevel, predictedDefects };
}

/**
 * 构建预测报告。
 *
 * @param result 预测结果
 * @returns 预测报告（riskLevel + predictedDefects 透传）
 */
export function buildAiDefectPredictReport(result: AiDefectPredictResultV14): AiDefectPredictReportV14 {
  // 手算：透传 riskLevel + predictedDefects
  // 测试4：{riskLevel='高', predictedDefects=1} → riskLevel='高', predictedDefects=1
  return { riskLevel: result.riskLevel, predictedDefects: result.predictedDefects };
}
