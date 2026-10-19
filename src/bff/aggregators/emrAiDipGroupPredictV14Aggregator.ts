/**
 * 健澜科技 jlmedaios - 病历AI DIP 分组预测 V14 聚合器（M552-B）
 *
 * 纯函数：构建 AI DIP 分组预测基础数据 + AI DIP 分组预测 + 构建 DIP 分组预测报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI DIP 分组预测基础数据 */
export interface AiDipGroupPredictV14 {
  recordId: string;
  dept: string;
}

/** AI DIP 分组预测输入 */
export interface AiDipGroupPredictInputV14 {
  diagnosis: string;
  cost: number;
}

/** AI DIP 分组预测结果 */
export interface AiDipGroupPredictResultV14 {
  dipCode: string;
  score: number;
}

/** DIP 分组预测报告 */
export interface AiDipGroupPredictReportV14 {
  dipCode: string;
  score: number;
}

/**
 * 构建 AI DIP 分组预测基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI DIP 分组预测基础数据
 */
export function buildAiDipGroupPredict(recordId: string, dept: string): AiDipGroupPredictV14 {
  return { recordId, dept };
}

/**
 * AI DIP 分组预测。
 * dipCode = diagnosis.includes('心梗') ? 'P19' : 'P01'
 * score = Math.round(cost * 100) / 100
 *
 * @param input DIP 分组预测输入（诊断 + 费用）
 * @returns DIP 分组预测结果（dipCode + score）
 */
export function predictDipGroupByAi(input: AiDipGroupPredictInputV14): AiDipGroupPredictResultV14 {
  // 手算：dipCode = diagnosis.includes('心梗') ? 'P19' : 'P01'
  // 测试2：diagnosis='急性心梗' → includes('心梗')=true → dipCode='P19'
  // 测试3：diagnosis='上感' → 不含心梗 → dipCode='P01'
  const dipCode = input.diagnosis.includes("心梗") ? "P19" : "P01";
  // 手算：score = Math.round(cost * 100) / 100
  // 测试2：cost=25000 → Math.round(25000*100)/100 = Math.round(2500000)/100 = 25000.00
  // 测试3：cost=1500 → Math.round(1500*100)/100 = Math.round(150000)/100 = 1500.00
  const score = Math.round(input.cost * 100) / 100;
  return { dipCode, score };
}

/**
 * 构建 DIP 分组预测报告。
 *
 * @param result DIP 分组预测结果
 * @returns DIP 分组预测报告（dipCode + score 透传）
 */
export function buildAiDipGroupPredictReport(result: AiDipGroupPredictResultV14): AiDipGroupPredictReportV14 {
  // 手算：透传 dipCode + score
  // 测试4：{dipCode='P19', score=25000.00} → 透传
  return { dipCode: result.dipCode, score: result.score };
}
