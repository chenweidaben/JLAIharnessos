/**
 * 健澜科技 jlmedaios - 病历AI检查报告AI解读摘要 V14 聚合器（M561-C）
 *
 * 纯函数：构建 AI 检查报告AI解读摘要基础数据 + AI 检查报告AI解读摘要 + 构建检查报告AI解读摘要报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 检查报告AI解读摘要基础数据 */
export interface AiExamReportSummaryV14 {
  recordId: string;
  dept: string;
}

/** AI 检查报告AI解读摘要输入 */
export interface AiExamReportSummaryInputV14 {
  examType: string;
  findings: string;
}

/** AI 检查报告AI解读摘要结果 */
export interface AiExamReportSummaryResultV14 {
  summary: string;
  impression: string;
}

/** 检查报告AI解读摘要报告 */
export interface AiExamReportSummaryReportV14 {
  summary: string;
  impression: string;
}

/**
 * 构建 AI 检查报告AI解读摘要基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 检查报告AI解读摘要基础数据
 */
export function buildAiExamReportSummary(recordId: string, dept: string): AiExamReportSummaryV14 {
  return { recordId, dept };
}

/**
 * AI 检查报告AI解读摘要。
 * summary = `${examType}检查结果：${findings}`
 * impression = findings.includes('异常') ? '建议结合临床进一步检查' : '未见明显异常'
 *
 * @param input 报告解读摘要输入（检查类型 + 检查所见）
 * @returns 报告解读摘要结果（summary + impression）
 */
export function summarizeExamReportByAi(input: AiExamReportSummaryInputV14): AiExamReportSummaryResultV14 {
  // 手算：summary = `${examType}检查结果：${findings}`
  // 测试2：examType='胸部CT', findings='右下肺见斑片状阴影，考虑炎症'
  //   = '胸部CT检查结果：右下肺见斑片状阴影，考虑炎症'
  // 测试3：examType='腹部B超', findings='肝胆胰脾未见明显异常'
  //   = '腹部B超检查结果：肝胆胰脾未见明显异常'
  const summary = `${input.examType}检查结果：${input.findings}`;
  // 手算：impression = findings.includes('异常') ? '建议结合临床进一步检查' : '未见明显异常'
  // 测试2：findings='右下肺见斑片状阴影，考虑炎症' → includes('异常')=false → '未见明显异常'
  // 测试3：findings='肝胆胰脾未见明显异常' → includes('异常')=true → '建议结合临床进一步检查'
  const impression = input.findings.includes("异常")
    ? "建议结合临床进一步检查"
    : "未见明显异常";
  return { summary, impression };
}

/**
 * 构建检查报告AI解读摘要报告。
 *
 * @param result 报告解读摘要结果
 * @returns 报告解读摘要报告（summary + impression 透传）
 */
export function buildAiExamReportSummaryReport(result: AiExamReportSummaryResultV14): AiExamReportSummaryReportV14 {
  // 手算：透传 summary + impression
  // 测试4：{summary='测试摘要', impression='测试印象'} → 透传
  return { summary: result.summary, impression: result.impression };
}
