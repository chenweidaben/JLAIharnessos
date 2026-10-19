/**
 * 健澜科技 jlmedaios - 病历AI ICD 编码推荐 V14 聚合器（M551-B）
 *
 * 纯函数：构建 AI ICD 编码推荐基础数据 + AI ICD 编码推荐 + 构建 ICD 编码推荐报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI ICD 编码推荐基础数据 */
export interface AiIcdRecoV14 {
  recordId: string;
  dept: string;
}

/** AI ICD 编码推荐输入 */
export interface AiIcdRecoInputV14 {
  diagnosis: string;
}

/** AI ICD 编码推荐结果 */
export interface AiIcdRecoResultV14 {
  icdCode: string;
  confidence: number;
}

/** ICD 编码推荐报告 */
export interface AiIcdRecoReportV14 {
  icdCode: string;
  confidence: number;
}

/**
 * 构建 AI ICD 编码推荐基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI ICD 编码推荐基础数据
 */
export function buildAiIcdReco(recordId: string, dept: string): AiIcdRecoV14 {
  return { recordId, dept };
}

/**
 * AI ICD 编码推荐。
 * icdCode = diagnosis.includes('肺炎') ? 'J18.9' : diagnosis.includes('心梗') ? 'I21.4' : 'R00.0'
 * confidence = icdCode === 'R00.0' ? 0.6 : 0.92
 *
 * @param input ICD 编码推荐输入（诊断描述）
 * @returns ICD 编码推荐结果（icdCode + confidence）
 */
export function recommendIcdByAi(input: AiIcdRecoInputV14): AiIcdRecoResultV14 {
  // 手算：icdCode = diagnosis.includes('肺炎') ? 'J18.9' : diagnosis.includes('心梗') ? 'I21.4' : 'R00.0'
  // 测试2：diagnosis='社区获得性肺炎' → includes('肺炎')=true → icdCode='J18.9'
  // 测试3：diagnosis='头晕待查' → 不含肺炎/心梗 → icdCode='R00.0'
  const icdCode = input.diagnosis.includes("肺炎") ? "J18.9" : input.diagnosis.includes("心梗") ? "I21.4" : "R00.0";
  // 手算：confidence = icdCode === 'R00.0' ? 0.6 : 0.92
  // 测试2：icdCode='J18.9' !== 'R00.0' → confidence=0.92
  // 测试3：icdCode='R00.0' → confidence=0.6
  const confidence = icdCode === "R00.0" ? 0.6 : 0.92;
  return { icdCode, confidence };
}

/**
 * 构建 ICD 编码推荐报告。
 *
 * @param result ICD 编码推荐结果
 * @returns ICD 编码推荐报告（icdCode + confidence 透传）
 */
export function buildAiIcdRecoReport(result: AiIcdRecoResultV14): AiIcdRecoReportV14 {
  // 手算：透传 icdCode + confidence
  // 测试4：{icdCode='J18.9', confidence=0.92} → 透传
  return { icdCode: result.icdCode, confidence: result.confidence };
}
