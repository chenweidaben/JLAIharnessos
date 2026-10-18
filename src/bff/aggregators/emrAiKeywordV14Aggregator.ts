/**
 * 健澜科技 jlmedaios - AI 病历关键词提取 V14 聚合器（M486-B）
 *
 * 纯函数：关键词提取 + 报告构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 关键词结果 */
export interface AiKeywordResultV14 {
  content: string;
  keywords: string[];
}

/** AI 关键词报告 */
export interface AiKeywordReportV14 {
  keywordCount: number;
  topKeywords: string[];
}

/** 医学关键词词典 */
const MEDICAL_KEYWORDS = ["头痛", "发热", "咳嗽", "腹痛", "腹泻", "恶心", "呕吐", "胸痛", "头晕", "乏力"];

/**
 * 从病历正文提取关键词（模拟 NLP 关键词提取）。
 *
 * @param content 病历正文
 * @returns 关键词结果
 */
export function extractAiKeywords(content: string): AiKeywordResultV14 {
  const keywords: string[] = [];
  for (const kw of MEDICAL_KEYWORDS) {
    if (content.includes(kw)) {
      keywords.push(kw);
    }
  }
  return { content, keywords };
}

/**
 * 构建关键词报告。
 *
 * @param result 关键词结果
 * @returns 报告
 */
export function buildKeywordReport(result: AiKeywordResultV14): AiKeywordReportV14 {
  const keywordCount = result.keywords.length;
  const topKeywords = result.keywords.slice(0, 5);
  return { keywordCount, topKeywords };
}
