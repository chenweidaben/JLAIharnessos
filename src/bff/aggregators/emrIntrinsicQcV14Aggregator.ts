/**
 * 健澜科技 jlmedaios - 病历内涵质控 V14 聚合器（M477-A）
 *
 * 纯函数：NLP 关键词命中分析 + 内涵质量评分。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 内涵质控结果 */
export interface IntrinsicQcResultV14 {
  hits: number;
  totalKeywords: number;
  hitKeywords: string[];
  score: number;
}

/** 内涵质控关键词（5 个） */
const INTRINSIC_KEYWORDS: string[] = [
  "主诉",
  "现病史",
  "诊断",
  "治疗",
  "预后",
];

/**
 * 运行内涵质控：NLP 分析病历正文，统计关键词命中数。
 *
 * @param content 病历正文
 * @returns 内涵质控结果
 */
export function runIntrinsicQc(content: string): IntrinsicQcResultV14 {
  const hitKeywords = INTRINSIC_KEYWORDS.filter((kw) => content.includes(kw));
  const hits = hitKeywords.length;
  const totalKeywords = INTRINSIC_KEYWORDS.length;
  const score = scoreIntrinsicQuality(hits, totalKeywords);
  return { hits, totalKeywords, hitKeywords, score };
}

/**
 * 计算内涵质量得分：score=hits/totalKeywords×100（整数）。
 *
 * @param hits 命中关键词数
 * @param totalKeywords 关键词总数
 * @returns 内涵质量得分（0-100）
 */
export function scoreIntrinsicQuality(hits: number, totalKeywords: number): number {
  if (totalKeywords === 0) return 0;
  return Math.round((hits / totalKeywords) * 100);
}
