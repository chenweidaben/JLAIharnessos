/**
 * 健澜科技 jlmedaios - 病历AI手术编码建议 V14 聚合器（M544-B）
 *
 * 纯函数：构建 AI 手术编码基础数据 + AI 手术编码建议 + 构建手术编码报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 手术编码基础数据 */
export interface AiOpCodingV14 {
  recordId: string;
  dept: string;
}

/** AI 手术编码建议输入 */
export interface AiOpCodingInputV14 {
  opName: string;
}

/** AI 手术编码建议结果 */
export interface AiOpCodingResultV14 {
  icd9Code: string;
  confidence: number;
}

/** 手术编码报告 */
export interface AiOpCodingReportV14 {
  icd9Code: string;
  confidence: number;
}

/**
 * 构建 AI 手术编码基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 手术编码基础数据
 */
export function buildAiOpCoding(recordId: string, dept: string): AiOpCodingV14 {
  return { recordId, dept };
}

/**
 * AI 手术编码建议。
 * icd9Code = opName.includes('搭桥') ? '36.100' : opName.includes('支架') ? '36.060' : '00.000'
 * confidence = 0.90
 *
 * @param input 手术编码建议输入（手术名称）
 * @returns 手术编码建议结果（icd9Code + confidence）
 */
export function suggestOpCodingByAi(input: AiOpCodingInputV14): AiOpCodingResultV14 {
  // 手算：icd9Code = opName.includes('搭桥') ? '36.100' : opName.includes('支架') ? '36.060' : '00.000'
  // 测试2：opName='冠状动脉搭桥术' → 含'搭桥' → icd9Code='36.100'
  // 测试3：opName='冠脉支架植入术' → 不含'搭桥'，含'支架' → icd9Code='36.060'
  const icd9Code = input.opName.includes("搭桥")
    ? "36.100"
    : input.opName.includes("支架")
      ? "36.060"
      : "00.000";
  // 手算：confidence = 0.90
  const confidence = 0.90;
  return { icd9Code, confidence };
}

/**
 * 构建手术编码报告。
 *
 * @param result 手术编码建议结果
 * @returns 手术编码报告（icd9Code + confidence 透传）
 */
export function buildAiOpCodingReport(result: AiOpCodingResultV14): AiOpCodingReportV14 {
  // 手算：透传 icd9Code + confidence
  // 测试4：{icd9Code='36.100', confidence=0.90} → 透传
  return { icd9Code: result.icd9Code, confidence: result.confidence };
}
