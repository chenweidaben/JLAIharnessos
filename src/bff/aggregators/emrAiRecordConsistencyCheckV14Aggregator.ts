/**
 * 健澜科技 jlmedaios - 病历AI病历逻辑一致性检查 V14 聚合器（M553-C）
 *
 * 纯函数：构建 AI 病历逻辑一致性检查基础数据 + AI 病历逻辑一致性检查 + 构建一致性检查报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 病历逻辑一致性检查基础数据 */
export interface AiRecordConsistencyCheckV14 {
  recordId: string;
  dept: string;
}

/** AI 病历逻辑一致性检查输入 */
export interface AiRecordConsistencyCheckInputV14 {
  admissionDiagnosis: string;
  dischargeDiagnosis: string;
}

/** AI 病历逻辑一致性检查结果 */
export interface AiRecordConsistencyCheckResultV14 {
  isConsistent: boolean;
  issueCount: number;
}

/** 一致性检查报告 */
export interface AiRecordConsistencyCheckReportV14 {
  isConsistent: boolean;
  issueCount: number;
}

/**
 * 构建 AI 病历逻辑一致性检查基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 病历逻辑一致性检查基础数据
 */
export function buildAiRecordConsistencyCheck(recordId: string, dept: string): AiRecordConsistencyCheckV14 {
  return { recordId, dept };
}

/**
 * AI 病历逻辑一致性检查。
 * isConsistent = admissionDiagnosis === dischargeDiagnosis
 *   || dischargeDiagnosis.includes(admissionDiagnosis)
 *   || admissionDiagnosis.includes(dischargeDiagnosis)
 * issueCount = isConsistent ? 0 : 1
 *
 * @param input 一致性检查输入（入院诊断 + 出院诊断）
 * @returns 一致性检查结果（isConsistent + issueCount）
 */
export function checkRecordConsistencyByAi(input: AiRecordConsistencyCheckInputV14): AiRecordConsistencyCheckResultV14 {
  // 手算：isConsistent = admissionDiagnosis === dischargeDiagnosis
  //   || dischargeDiagnosis.includes(admissionDiagnosis)
  //   || admissionDiagnosis.includes(dischargeDiagnosis)
  // 测试2：admissionDiagnosis='急性心梗', dischargeDiagnosis='急性心梗'
  //   '急性心梗' === '急性心梗' → true
  // 测试3：admissionDiagnosis='肺炎', dischargeDiagnosis='急性心梗'
  //   ('肺炎' === '急性心梗') || ('急性心梗'.includes('肺炎')) || ('肺炎'.includes('急性心梗')) → false || false || false → false
  const isConsistent =
    input.admissionDiagnosis === input.dischargeDiagnosis ||
    input.dischargeDiagnosis.includes(input.admissionDiagnosis) ||
    input.admissionDiagnosis.includes(input.dischargeDiagnosis);
  // 手算：issueCount = isConsistent ? 0 : 1
  // 测试2：isConsistent=true → issueCount=0
  // 测试3：isConsistent=false → issueCount=1
  const issueCount = isConsistent ? 0 : 1;
  return { isConsistent, issueCount };
}

/**
 * 构建一致性检查报告。
 *
 * @param result 一致性检查结果
 * @returns 一致性检查报告（isConsistent + issueCount 透传）
 */
export function buildAiRecordConsistencyCheckReport(result: AiRecordConsistencyCheckResultV14): AiRecordConsistencyCheckReportV14 {
  // 手算：透传 isConsistent + issueCount
  // 测试4：{isConsistent=true, issueCount=0} → 透传
  return { isConsistent: result.isConsistent, issueCount: result.issueCount };
}
