/**
 * 健澜科技 jlmedaios - 病历AI转诊建议 V14 聚合器（M547-C）
 *
 * 纯函数：构建 AI 转诊建议基础数据 + AI 转诊建议 + 构建转诊报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 转诊建议基础数据 */
export interface AiReferralSuggestV14 {
  recordId: string;
  dept: string;
}

/** AI 转诊建议输入 */
export interface AiReferralSuggestInputV14 {
  diagnosis: string;
  severity: number;
}

/** AI 转诊建议结果 */
export interface AiReferralSuggestResultV14 {
  needReferral: boolean;
  targetDept: string;
}

/** 转诊报告 */
export interface AiReferralSuggestReportV14 {
  needReferral: boolean;
  targetDept: string;
}

/**
 * 构建 AI 转诊建议基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 转诊建议基础数据
 */
export function buildAiReferralSuggest(recordId: string, dept: string): AiReferralSuggestV14 {
  return { recordId, dept };
}

/**
 * AI 转诊建议。
 * needReferral = diagnosis.includes('心梗') && severity >= 8
 * targetDept = needReferral ? '心内科ICU' : '普通病房'
 *
 * @param input 转诊建议输入（诊断 + 严重程度）
 * @returns 转诊建议结果（needReferral + targetDept）
 */
export function suggestReferralByAi(input: AiReferralSuggestInputV14): AiReferralSuggestResultV14 {
  // 手算：needReferral = diagnosis.includes('心梗') && severity >= 8
  // 测试2：diagnosis='急性心梗', severity=9 → 含'心梗'且 9>=8 → needReferral=true
  // 测试3：diagnosis='上感', severity=3 → 不含'心梗' → needReferral=false
  const needReferral = input.diagnosis.includes("心梗") && input.severity >= 8;
  // 手算：targetDept = needReferral ? '心内科ICU' : '普通病房'
  // 测试2：needReferral=true → targetDept='心内科ICU'
  // 测试3：needReferral=false → targetDept='普通病房'
  const targetDept = needReferral ? "心内科ICU" : "普通病房";
  return { needReferral, targetDept };
}

/**
 * 构建转诊报告。
 *
 * @param result 转诊建议结果
 * @returns 转诊报告（needReferral + targetDept 透传）
 */
export function buildAiReferralSuggestReport(result: AiReferralSuggestResultV14): AiReferralSuggestReportV14 {
  // 手算：透传 needReferral + targetDept
  // 测试4：{needReferral=true, targetDept='心内科ICU'} → 透传
  return { needReferral: result.needReferral, targetDept: result.targetDept };
}
