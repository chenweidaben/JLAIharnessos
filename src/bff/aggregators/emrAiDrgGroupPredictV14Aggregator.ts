/**
 * 健澜科技 jlmedaios - 病历AI DRG 分组预测 V14 聚合器（M552-A）
 *
 * 纯函数：构建 AI DRG 分组预测基础数据 + AI DRG 分组预测 + 构建 DRG 分组预测报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI DRG 分组预测基础数据 */
export interface AiDrgGroupPredictV14 {
  recordId: string;
  dept: string;
}

/** AI DRG 分组预测输入 */
export interface AiDrgGroupPredictInputV14 {
  diagnosis: string;
  hasSurgery: boolean;
}

/** AI DRG 分组预测结果 */
export interface AiDrgGroupPredictResultV14 {
  drgGroup: string;
  weight: number;
}

/** DRG 分组预测报告 */
export interface AiDrgGroupPredictReportV14 {
  drgGroup: string;
  weight: number;
}

/**
 * 构建 AI DRG 分组预测基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI DRG 分组预测基础数据
 */
export function buildAiDrgGroupPredict(recordId: string, dept: string): AiDrgGroupPredictV14 {
  return { recordId, dept };
}

/**
 * AI DRG 分组预测。
 * drgGroup = diagnosis.includes('心梗') && hasSurgery ? 'FM1' : diagnosis.includes('心梗') ? 'FM2' : 'GB1'
 * weight = drgGroup === 'FM1' ? 1.8 : drgGroup === 'FM2' ? 1.2 : 0.8
 *
 * @param input DRG 分组预测输入（主诊断 + 是否手术）
 * @returns DRG 分组预测结果（drgGroup + weight）
 */
export function predictDrgGroupByAi(input: AiDrgGroupPredictInputV14): AiDrgGroupPredictResultV14 {
  // 手算：drgGroup = diagnosis.includes('心梗') && hasSurgery ? 'FM1' : diagnosis.includes('心梗') ? 'FM2' : 'GB1'
  // 测试2：diagnosis='急性心梗', hasSurgery=true → includes('心梗')=true 且 hasSurgery=true → drgGroup='FM1'
  // 测试3：diagnosis='上呼吸道感染', hasSurgery=false → 不含心梗 → drgGroup='GB1'
  const drgGroup = input.diagnosis.includes("心梗") && input.hasSurgery ? "FM1" : input.diagnosis.includes("心梗") ? "FM2" : "GB1";
  // 手算：weight = drgGroup === 'FM1' ? 1.8 : drgGroup === 'FM2' ? 1.2 : 0.8
  // 测试2：drgGroup='FM1' → weight=1.8
  // 测试3：drgGroup='GB1' → weight=0.8
  const weight = drgGroup === "FM1" ? 1.8 : drgGroup === "FM2" ? 1.2 : 0.8;
  return { drgGroup, weight };
}

/**
 * 构建 DRG 分组预测报告。
 *
 * @param result DRG 分组预测结果
 * @returns DRG 分组预测报告（drgGroup + weight 透传）
 */
export function buildAiDrgGroupPredictReport(result: AiDrgGroupPredictResultV14): AiDrgGroupPredictReportV14 {
  // 手算：透传 drgGroup + weight
  // 测试4：{drgGroup='FM1', weight=1.8} → 透传
  return { drgGroup: result.drgGroup, weight: result.weight };
}
