/**
 * 健澜科技 jlmedaios - 病历AI病案首页智能编码 V14 聚合器（M556-A）
 *
 * 纯函数：构建 AI 病案首页智能编码基础数据 + AI 病案首页智能编码 + 构建首页智能编码报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 病案首页智能编码基础数据 */
export interface AiFrontpageSmartCodingV14 {
  recordId: string;
  dept: string;
}

/** AI 病案首页智能编码输入 */
export interface AiFrontpageSmartCodingInputV14 {
  diagnosis: string;
}

/** AI 病案首页智能编码结果 */
export interface AiFrontpageSmartCodingResultV14 {
  icdCode: string;
  diagnosisName: string;
}

/** 首页智能编码报告 */
export interface AiFrontpageSmartCodingReportV14 {
  icdCode: string;
  diagnosisName: string;
}

/**
 * 构建 AI 病案首页智能编码基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 病案首页智能编码基础数据
 */
export function buildAiFrontpageSmartCoding(recordId: string, dept: string): AiFrontpageSmartCodingV14 {
  return { recordId, dept };
}

/**
 * AI 病案首页智能编码。
 * icdCode = diagnosis.includes('心梗') ? 'I21.4' : diagnosis.includes('肺炎') ? 'J18.9' : 'R69.X'
 * diagnosisName = diagnosis
 *
 * @param input 首页智能编码输入（诊断）
 * @returns 首页智能编码结果（icdCode + diagnosisName）
 */
export function codeFrontpageByAi(input: AiFrontpageSmartCodingInputV14): AiFrontpageSmartCodingResultV14 {
  // 手算：icdCode = diagnosis.includes('心梗') ? 'I21.4' : diagnosis.includes('肺炎') ? 'J18.9' : 'R69.X'
  // 测试2：diagnosis='急性心梗' → includes('心梗')=true → icdCode='I21.4'
  // 测试3：diagnosis='上呼吸道感染' → 不含心梗/肺炎 → icdCode='R69.X'
  const icdCode = input.diagnosis.includes("心梗")
    ? "I21.4"
    : input.diagnosis.includes("肺炎")
      ? "J18.9"
      : "R69.X";
  // 手算：diagnosisName = diagnosis（透传）
  // 测试2：diagnosisName='急性心梗'
  // 测试3：diagnosisName='上呼吸道感染'
  const diagnosisName = input.diagnosis;
  return { icdCode, diagnosisName };
}

/**
 * 构建首页智能编码报告。
 *
 * @param result 首页智能编码结果
 * @returns 首页智能编码报告（icdCode + diagnosisName 透传）
 */
export function buildAiFrontpageSmartCodingReport(result: AiFrontpageSmartCodingResultV14): AiFrontpageSmartCodingReportV14 {
  // 手算：透传 icdCode + diagnosisName
  // 测试4：{icdCode='I21.4', diagnosisName='急性心梗'} → 透传
  return { icdCode: result.icdCode, diagnosisName: result.diagnosisName };
}
