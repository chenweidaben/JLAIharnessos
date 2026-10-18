/**
 * 健澜科技 jlmedaios - 病历AI诊断编码建议 V14 聚合器（M544-A）
 *
 * 纯函数：构建 AI 诊断编码基础数据 + AI 诊断编码建议 + 构建编码报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 诊断编码基础数据 */
export interface AiDxCodingV14 {
  recordId: string;
  dept: string;
}

/** AI 诊断编码建议输入 */
export interface AiDxCodingInputV14 {
  diagnosis: string;
}

/** AI 诊断编码建议结果 */
export interface AiDxCodingResultV14 {
  icdCode: string;
  confidence: number;
}

/** 编码报告 */
export interface AiDxCodingReportV14 {
  icdCode: string;
  confidence: number;
}

/**
 * 构建 AI 诊断编码基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 诊断编码基础数据
 */
export function buildAiDxCoding(recordId: string, dept: string): AiDxCodingV14 {
  return { recordId, dept };
}

/**
 * AI 诊断编码建议。
 * icdCode = diagnosis.includes('肺炎') ? 'J18.900' : diagnosis.includes('心梗') ? 'I21.400' : 'R00.000'
 * confidence = 0.92
 *
 * @param input 编码建议输入（诊断描述）
 * @returns 编码建议结果（icdCode + confidence）
 */
export function suggestDxCodingByAi(input: AiDxCodingInputV14): AiDxCodingResultV14 {
  // 手算：icdCode = diagnosis.includes('肺炎') ? 'J18.900' : diagnosis.includes('心梗') ? 'I21.400' : 'R00.000'
  // 测试2：diagnosis='社区获得性肺炎' → 含'肺炎' → icdCode='J18.900'
  // 测试3：diagnosis='急性心梗' → 不含'肺炎'，含'心梗' → icdCode='I21.400'
  const icdCode = input.diagnosis.includes("肺炎")
    ? "J18.900"
    : input.diagnosis.includes("心梗")
      ? "I21.400"
      : "R00.000";
  // 手算：confidence = 0.92
  const confidence = 0.92;
  return { icdCode, confidence };
}

/**
 * 构建编码报告。
 *
 * @param result 编码建议结果
 * @returns 编码报告（icdCode + confidence 透传）
 */
export function buildAiDxCodingReport(result: AiDxCodingResultV14): AiDxCodingReportV14 {
  // 手算：透传 icdCode + confidence
  // 测试4：{icdCode='J18.900', confidence=0.92} → 透传
  return { icdCode: result.icdCode, confidence: result.confidence };
}
