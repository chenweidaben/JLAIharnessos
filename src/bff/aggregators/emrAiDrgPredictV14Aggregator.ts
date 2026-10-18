/**
 * 健澜科技 jlmedaios - 病历AI DRG分组预测 V14 聚合器（M544-D，M544 收官）
 *
 * 纯函数：构建 AI DRG 预测基础数据 + AI DRG 分组预测 + 构建 DRG 报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI DRG 预测基础数据 */
export interface AiDrgPredictV14 {
  recordId: string;
  dept: string;
}

/** AI DRG 分组预测输入 */
export interface AiDrgPredictInputV14 {
  diagnosis: string;
  hasSurgery: boolean;
}

/** AI DRG 分组预测结果 */
export interface AiDrgPredictResultV14 {
  drgGroup: string;
  weight: number;
}

/** DRG 报告 */
export interface AiDrgPredictReportV14 {
  drgGroup: string;
  weight: number;
}

/**
 * 构建 AI DRG 预测基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI DRG 预测基础数据
 */
export function buildAiDrgPredict(recordId: string, dept: string): AiDrgPredictV14 {
  return { recordId, dept };
}

/**
 * AI DRG 分组预测。
 * drgGroup = diagnosis.includes('心梗') && hasSurgery ? 'FM1' : diagnosis.includes('心梗') ? 'FM2' : 'UN'
 * weight = drgGroup === 'FM1' ? 1.8 : drgGroup === 'FM2' ? 1.2 : 0.5
 *
 * @param input 预测输入（诊断 + 是否手术）
 * @returns 预测结果（drgGroup + weight）
 */
export function predictDrgByAi(input: AiDrgPredictInputV14): AiDrgPredictResultV14 {
  // 手算：drgGroup = diagnosis.includes('心梗') && hasSurgery ? 'FM1' : diagnosis.includes('心梗') ? 'FM2' : 'UN'
  // 测试2：diagnosis='急性心梗', hasSurgery=true → 含'心梗'且有手术 → drgGroup='FM1'
  // 测试3：diagnosis='急性心梗', hasSurgery=false → 含'心梗'但无手术 → drgGroup='FM2'
  const drgGroup =
    input.diagnosis.includes("心梗") && input.hasSurgery
      ? "FM1"
      : input.diagnosis.includes("心梗")
        ? "FM2"
        : "UN";
  // 手算：weight = drgGroup === 'FM1' ? 1.8 : drgGroup === 'FM2' ? 1.2 : 0.5
  // 测试2：drgGroup='FM1' → weight=1.8
  // 测试3：drgGroup='FM2' → weight=1.2
  const weight = drgGroup === "FM1" ? 1.8 : drgGroup === "FM2" ? 1.2 : 0.5;
  return { drgGroup, weight };
}

/**
 * 构建 DRG 报告。
 *
 * @param result 预测结果
 * @returns DRG 报告（drgGroup + weight 透传）
 */
export function buildAiDrgPredictReport(result: AiDrgPredictResultV14): AiDrgPredictReportV14 {
  // 手算：透传 drgGroup + weight
  // 测试4：{drgGroup='FM1', weight=1.8} → 透传
  return { drgGroup: result.drgGroup, weight: result.weight };
}
