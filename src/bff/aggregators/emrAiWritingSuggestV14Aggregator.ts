/**
 * 健澜科技 jlmedaios - 病历AI病历书写建议 V14 聚合器（M553-A）
 *
 * 纯函数：构建 AI 病历书写建议基础数据 + AI 病历书写建议 + 构建书写建议报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 病历书写建议基础数据 */
export interface AiWritingSuggestV14 {
  recordId: string;
  dept: string;
}

/** AI 病历书写建议输入 */
export interface AiWritingSuggestInputV14 {
  recordType: string;
  hasChiefComplaint: boolean;
}

/** AI 病历书写建议结果 */
export interface AiWritingSuggestResultV14 {
  suggestion: string;
  priority: string;
}

/** 书写建议报告 */
export interface AiWritingSuggestReportV14 {
  suggestion: string;
  priority: string;
}

/**
 * 构建 AI 病历书写建议基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 病历书写建议基础数据
 */
export function buildAiWritingSuggest(recordId: string, dept: string): AiWritingSuggestV14 {
  return { recordId, dept };
}

/**
 * AI 病历书写建议。
 * suggestion = !hasChiefComplaint ? '建议补充主诉内容' : '建议完善现病史描述'
 * priority = !hasChiefComplaint ? '高' : '中'
 *
 * @param input 书写建议输入（病历类型 + 是否有主诉）
 * @returns 书写建议结果（suggestion + priority）
 */
export function suggestWritingByAi(input: AiWritingSuggestInputV14): AiWritingSuggestResultV14 {
  // 手算：suggestion = !hasChiefComplaint ? '建议补充主诉内容' : '建议完善现病史描述'
  // 测试2：hasChiefComplaint=false → suggestion='建议补充主诉内容'
  // 测试3：hasChiefComplaint=true → suggestion='建议完善现病史描述'
  const suggestion = !input.hasChiefComplaint ? "建议补充主诉内容" : "建议完善现病史描述";
  // 手算：priority = !hasChiefComplaint ? '高' : '中'
  // 测试2：hasChiefComplaint=false → priority='高'
  // 测试3：hasChiefComplaint=true → priority='中'
  const priority = !input.hasChiefComplaint ? "高" : "中";
  return { suggestion, priority };
}

/**
 * 构建书写建议报告。
 *
 * @param result 书写建议结果
 * @returns 书写建议报告（suggestion + priority 透传）
 */
export function buildAiWritingSuggestReport(result: AiWritingSuggestResultV14): AiWritingSuggestReportV14 {
  // 手算：透传 suggestion + priority
  // 测试4：{suggestion='建议补充主诉内容', priority='高'} → 透传
  return { suggestion: result.suggestion, priority: result.priority };
}
