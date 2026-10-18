/**
 * 健澜科技 jlmedaios - 病历AI生成建议 V14 聚合器（M543-A）
 *
 * 纯函数：构建 AI 建议基础数据 + AI 生成建议 + 构建建议报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 建议基础数据 */
export interface AiSuggestionV14 {
  recordId: string;
  dept: string;
}

/** AI 生成建议输入 */
export interface AiSuggestionInputV14 {
  recordType: string;
  symptom: string;
}

/** AI 生成建议结果 */
export interface AiSuggestionResultV14 {
  suggestion: string;
  confidence: number;
}

/** 建议报告 */
export interface AiSuggestionReportV14 {
  suggestion: string;
  confidence: number;
}

/**
 * 构建 AI 建议基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 建议基础数据
 */
export function buildAiSuggestion(recordId: string, dept: string): AiSuggestionV14 {
  return { recordId, dept };
}

/**
 * AI 生成建议。
 * suggestion = recordType==='入院记录' && symptom.includes('胸痛') ? '建议补充心梗相关检查记录' : '建议完善主诉描述'
 * confidence = 0.85
 *
 * @param input 输入（病历类型 + 症状描述）
 * @returns 生成结果（suggestion + confidence）
 */
export function generateAiSuggestion(input: AiSuggestionInputV14): AiSuggestionResultV14 {
  // 手算：suggestion = recordType==='入院记录' && symptom.includes('胸痛') ? '建议补充心梗相关检查记录' : '建议完善主诉描述'
  // 测试2：recordType='入院记录', symptom='胸痛3天' → 入院记录 && 含'胸痛' → suggestion='建议补充心梗相关检查记录'
  // 测试3：recordType='门诊病历', symptom='咳嗽' → 不是入院记录 → suggestion='建议完善主诉描述'
  const suggestion = input.recordType === "入院记录" && input.symptom.includes("胸痛")
    ? "建议补充心梗相关检查记录"
    : "建议完善主诉描述";
  // 手算：confidence = 0.85
  // 测试2：confidence=0.85
  // 测试3：confidence=0.85
  const confidence = 0.85;
  return { suggestion, confidence };
}

/**
 * 构建建议报告。
 *
 * @param result 生成结果
 * @returns 建议报告（suggestion + confidence 透传）
 */
export function buildAiSuggestionReport(result: AiSuggestionResultV14): AiSuggestionReportV14 {
  // 手算：透传 suggestion + confidence
  // 测试4：{suggestion='建议补充心梗相关检查记录', confidence=0.85} → suggestion='建议补充心梗相关检查记录', confidence=0.85
  return { suggestion: result.suggestion, confidence: result.confidence };
}
