/**
 * 健澜科技 jlmedaios - 病历 AI 辅助书写实时建议 V14 聚合器（M467-B）
 *
 * 纯函数：规则匹配建议生成（不调 LLM）+ 优先级排序。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 建议项 */
export interface SuggestionV14 {
  id: string;
  text: string;
  priority: number;
}

/**
 * 规则匹配生成书写建议。
 *
 * @param context 病历上下文文本
 * @returns 建议列表
 */
export function generateSuggestions(context: string): SuggestionV14[] {
  if (!context.trim()) return [];
  const suggestions: SuggestionV14[] = [];
  if (context.includes("咳嗽")) {
    suggestions.push({ id: "S001", text: "补充咳痰性状描述", priority: 4 });
  }
  if (context.includes("发热")) {
    suggestions.push({ id: "S002", text: "补充体温峰值与热型", priority: 5 });
  }
  return suggestions;
}

/**
 * 按优先级降序排序（5 最优先）。
 *
 * @param suggestions 建议列表
 * @returns 排序后建议列表
 */
export function rankSuggestions(suggestions: SuggestionV14[]): SuggestionV14[] {
  return [...suggestions].sort((a, b) => b.priority - a.priority);
}
