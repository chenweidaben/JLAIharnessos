/**
 * 健澜科技 jlmedaios - 病历AI鉴别诊断支持 V14 聚合器（M550-B）
 *
 * 纯函数：构建 AI 鉴别诊断基础数据 + AI 鉴别诊断支持 + 构建鉴别诊断报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 鉴别诊断基础数据 */
export interface AiDiagnosisDiffV14 {
  recordId: string;
  dept: string;
}

/** AI 鉴别诊断输入 */
export interface AiDiagnosisDiffInputV14 {
  symptom: string;
  age: number;
}

/** AI 鉴别诊断结果 */
export interface AiDiagnosisDiffResultV14 {
  candidates: string[];
  confidence: number;
}

/** 鉴别诊断报告 */
export interface AiDiagnosisDiffReportV14 {
  candidates: string[];
  confidence: number;
}

/**
 * 构建 AI 鉴别诊断基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 鉴别诊断基础数据
 */
export function buildAiDiagnosisDiff(recordId: string, dept: string): AiDiagnosisDiffV14 {
  return { recordId, dept };
}

/**
 * AI 鉴别诊断支持。
 * candidates = symptom.includes('胸痛') && age > 60 ? ['急性心梗', '心绞痛', '主动脉夹层'] : ['待查']
 * confidence = candidates.length > 1 ? 0.85 : 0.5
 *
 * @param input 鉴别诊断输入（症状 + 年龄）
 * @returns 鉴别诊断结果（candidates + confidence）
 */
export function diffDiagnosisByAi(input: AiDiagnosisDiffInputV14): AiDiagnosisDiffResultV14 {
  // 手算：candidates = symptom.includes('胸痛') && age > 60 ? ['急性心梗', '心绞痛', '主动脉夹层'] : ['待查']
  // 测试2：symptom='胸痛伴大汗', age=65 → includes('胸痛')=true 且 65>60=true → candidates=['急性心梗','心绞痛','主动脉夹层']
  // 测试3：symptom='咳嗽', age=30 → includes('胸痛')=false → candidates=['待查']
  const candidates = input.symptom.includes("胸痛") && input.age > 60
    ? ["急性心梗", "心绞痛", "主动脉夹层"]
    : ["待查"];
  // 手算：confidence = candidates.length > 1 ? 0.85 : 0.5
  // 测试2：candidates.length=3>1 → confidence=0.85
  // 测试3：candidates.length=1<=1 → confidence=0.5
  const confidence = candidates.length > 1 ? 0.85 : 0.5;
  return { candidates, confidence };
}

/**
 * 构建鉴别诊断报告。
 *
 * @param result 鉴别诊断结果
 * @returns 鉴别诊断报告（candidates + confidence 透传）
 */
export function buildAiDiagnosisDiffReport(result: AiDiagnosisDiffResultV14): AiDiagnosisDiffReportV14 {
  // 手算：透传 candidates + confidence
  // 测试4：{candidates=[3个], confidence=0.85} → 透传
  return { candidates: result.candidates, confidence: result.confidence };
}
