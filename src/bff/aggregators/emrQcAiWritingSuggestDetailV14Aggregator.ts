/**
 * 健澜科技 jlmedaios - 质控 AI 辅助书写建议明细 V14 聚合器（M508-B，-detail 避让）
 *
 * 纯函数：AI 生成书写建议 + 建议报告构建。
 * 避让说明：M467-B 已有 emrQcAiWritingSuggestV14，本切片改用 -detail 后缀避让。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 建议结果 */
export interface AiWritingSuggestResultDetailV14 {
  suggestions: string[];
}

/** 建议报告 */
export interface AiWritingSuggestReportDetailV14 {
  dept: string;
  section: string;
  count: number;
}

/**
 * AI 生成书写建议（根据科室和章节返回预设建议列表）。
 *
 * @param dept 科室
 * @param section 章节
 * @returns 建议结果（suggestions 数组）
 */
export function suggestWriting(dept: string, section: string): AiWritingSuggestResultDetailV14 {
  // 手算建议：根据科室+章节返回预设建议列表
  const suggestions: string[] = [];
  if (section.includes("主诉")) {
    suggestions.push("主诉应简明扼要，不超过20字");
    suggestions.push("避免使用医学术语，用患者原话");
  }
  if (section.includes("现病史")) {
    suggestions.push("按时间顺序描述病情演变");
    suggestions.push("包含起病时间、诱因、主要症状特点");
  }
  if (section.includes("手术") || dept.includes("外科")) {
    suggestions.push("记录手术名称、术者、麻醉方式");
    suggestions.push("详细描述术中发现和处理步骤");
  }
  if (suggestions.length === 0) {
    suggestions.push("建议使用规范术语书写");
    suggestions.push("确保内容完整、逻辑清晰");
  }
  return { suggestions };
}

/**
 * 构建建议报告。
 *
 * @param dept 科室
 * @param section 章节
 * @param result 建议结果
 * @returns 建议报告（dept + section + count）
 */
export function buildSuggestReport(
  dept: string,
  section: string,
  result: AiWritingSuggestResultDetailV14
): AiWritingSuggestReportDetailV14 {
  return {
    dept,
    section,
    count: result.suggestions.length,
  };
}
