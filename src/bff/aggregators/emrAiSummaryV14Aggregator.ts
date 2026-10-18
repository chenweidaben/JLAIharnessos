/**
 * 健澜科技 jlmedaios - AI 病历摘要生成 V14 聚合器（M486-A）
 *
 * 纯函数：摘要生成 + 报告构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 摘要结果 */
export interface AiSummaryResultV14 {
  content: string;
  summary: string;
}

/** AI 摘要报告 */
export interface AiSummaryReportV14 {
  summaryLength: number;
  readTime: number;
}

/**
 * 从病历正文提取关键信息生成摘要（模拟 AI）。
 *
 * @param content 病历正文
 * @returns 摘要结果
 */
export function generateAiSummary(content: string): AiSummaryResultV14 {
  const summary = content.length > 0 ? content.slice(0, 100) : "";
  return { content, summary };
}

/**
 * 构建摘要报告：readTime = Math.ceil(summaryLength / 500) 分钟。
 *
 * @param result 摘要结果
 * @returns 报告
 */
export function buildSummaryReport(result: AiSummaryResultV14): AiSummaryReportV14 {
  const summaryLength = result.summary.length;
  const readTime = summaryLength === 0 ? 0 : Math.ceil(summaryLength / 500);
  return { summaryLength, readTime };
}
