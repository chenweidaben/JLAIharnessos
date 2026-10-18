/**
 * 健澜科技 jlmedaios - 质控 AI 书写建议 V14 聚合器（M499-B）
 *
 * 纯函数：AI 书写建议生成 + 建议报告构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 建议结果 */
export interface SuggestResultV14 {
  suggestions: string[];
}

/** 建议报告 */
export interface SuggestReportV14 {
  suggestions: string[];
  count: number;
}

/**
 * AI 书写建议生成（按上下文关键词匹配）。
 *
 * @param context 病历上下文
 * @returns 建议结果（suggestions 数组）
 */
export function suggestWriting(context: string): SuggestResultV14 {
  // 手算建议生成逻辑：按上下文关键词匹配返回建议数组
  const suggestions: string[] = [];
  if (context.includes("主诉")) {
    suggestions.push("补充主诉内容");
  }
  if (context.includes("现病史")) {
    suggestions.push("扩展现病史细节");
  }
  if (context.includes("查体")) {
    suggestions.push("完善体格检查记录");
  }
  if (suggestions.length === 0) {
    suggestions.push("建议完善病历书写规范");
  }
  return { suggestions };
}

/**
 * 构建建议报告。
 *
 * @param result 建议结果
 * @returns 建议报告（suggestions 列表 + count）
 */
export function buildSuggestReport(result: SuggestResultV14): SuggestReportV14 {
  // 手算 count：建议列表的长度
  return {
    suggestions: result.suggestions,
    count: result.suggestions.length,
  };
}
