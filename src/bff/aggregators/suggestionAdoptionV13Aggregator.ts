/**
 * 健澜科技 jlmedaios - 改进建议采纳率追踪 V13 纯函数（M309-A）
 *
 * trackSuggestionAdoptionV13 / computeSuggestionAdoptionRateV13 / compareByDeptQuarterV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 建议项 */
export interface SuggestionItemV13 {
  suggestionId: string;
  title: string;
  dept: string;
  quarter: string;
  status: "adopted" | "rejected" | "implemented";
}

/** 采纳状态计数 */
export interface SuggestionAdoptionStatsV13 {
  adopted: number;
  rejected: number;
  implemented: number;
  total: number;
}

/**
 * 采纳状态计数（纯函数）：adopted/rejected/implemented/total。
 *
 * @param suggestions 建议列表
 * @returns 计数
 */
export function trackSuggestionAdoptionV13(suggestions: SuggestionItemV13[]): SuggestionAdoptionStatsV13 {
  return {
    adopted: suggestions.filter((s) => s.status === "adopted").length,
    rejected: suggestions.filter((s) => s.status === "rejected").length,
    implemented: suggestions.filter((s) => s.status === "implemented").length,
    total: suggestions.length,
  };
}

/**
 * 采纳率（纯函数）：adopted/total×100，整数。
 *
 * @param suggestions 建议列表
 * @returns 采纳率
 */
export function computeSuggestionAdoptionRateV13(suggestions: SuggestionItemV13[]): number {
  if (suggestions.length === 0) return 0;
  const adopted = suggestions.filter((s) => s.status === "adopted").length;
  return Math.round((adopted / suggestions.length) * 100);
}

/**
 * 按科室+季度分组对比（纯函数）：返回 { dept: { quarter: count } }。
 *
 * @param suggestions 建议列表
 * @returns 分组
 */
export function compareByDeptQuarterV13(
  suggestions: SuggestionItemV13[],
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};
  for (const s of suggestions) {
    if (!result[s.dept]) result[s.dept] = {};
    result[s.dept][s.quarter] = (result[s.dept][s.quarter] ?? 0) + 1;
  }
  return result;
}
