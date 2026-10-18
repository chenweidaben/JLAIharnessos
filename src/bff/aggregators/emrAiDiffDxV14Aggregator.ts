/**
 * 健澜科技 jlmedaios - 病历AI鉴别诊断 V14 聚合器（M545-B）
 *
 * 纯函数：构建 AI 鉴别诊断基础数据 + AI 鉴别诊断建议 + 构建鉴别诊断报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 鉴别诊断基础数据 */
export interface AiDiffDxV14 {
  recordId: string;
  dept: string;
}

/** AI 鉴别诊断建议输入 */
export interface AiDiffDxInputV14 {
  symptom: string;
}

/** AI 鉴别诊断建议结果 */
export interface AiDiffDxResultV14 {
  candidates: string[];
  count: number;
}

/** 鉴别诊断报告 */
export interface AiDiffDxReportV14 {
  candidates: string[];
  count: number;
}

/**
 * 构建 AI 鉴别诊断基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 鉴别诊断基础数据
 */
export function buildAiDiffDx(recordId: string, dept: string): AiDiffDxV14 {
  return { recordId, dept };
}

/**
 * AI 鉴别诊断建议。
 * candidates = symptom.includes('胸痛') ? ['心绞痛','急性心梗','主动脉夹层'] : ['待查']
 * count = candidates.length
 *
 * @param input 鉴别诊断输入（症状）
 * @returns 鉴别诊断结果（candidates + count）
 */
export function suggestDiffDx(input: AiDiffDxInputV14): AiDiffDxResultV14 {
  // 手算：candidates = symptom.includes('胸痛') ? ['心绞痛','急性心梗','主动脉夹层'] : ['待查']
  // 测试2：symptom='胸痛伴大汗' → 含'胸痛' → candidates=['心绞痛','急性心梗','主动脉夹层']
  // 测试3：symptom='咳嗽咳痰' → 不含'胸痛' → candidates=['待查']
  const candidates = input.symptom.includes("胸痛")
    ? ["心绞痛", "急性心梗", "主动脉夹层"]
    : ["待查"];
  // 手算：count = candidates.length
  // 测试2：candidates.length = 3
  // 测试3：candidates.length = 1
  const count = candidates.length;
  return { candidates, count };
}

/**
 * 构建鉴别诊断报告。
 *
 * @param result 鉴别诊断结果
 * @returns 鉴别诊断报告（candidates + count 透传）
 */
export function buildAiDiffDxReport(result: AiDiffDxResultV14): AiDiffDxReportV14 {
  // 手算：透传 candidates + count
  // 测试4：{candidates=['心绞痛','急性心梗','主动脉夹层'], count=3} → 透传
  return { candidates: result.candidates, count: result.count };
}
