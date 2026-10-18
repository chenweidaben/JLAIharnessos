/**
 * 健澜科技 jlmedaios - 质控 AI 缺陷自动分类明细 V14 聚合器（M508-A，-detail 避让）
 *
 * 纯函数：AI 分类缺陷 + 分类报告构建。
 * 避让说明：M470-C 已有 emrQcAiDefectClassifyV14，本切片改用 -detail 后缀避让。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 分类结果 */
export interface AiDefectClassifyResultDetailV14 {
  category: string;
  confidence: number;
}

/** 分类报告 */
export interface AiDefectClassifyReportDetailV14 {
  total: number;
  avgConfidence: number;
  categories: string[];
}

/**
 * AI 分类缺陷（根据关键词匹配返回类别和置信度）。
 *
 * @param text 缺陷文本
 * @returns 分类结果（category + confidence）
 */
export function classifyDefect(text: string): AiDefectClassifyResultDetailV14 {
  // 手算分类：根据关键词匹配返回预设类别和置信度分数
  if (text.includes("签名")) {
    return { category: "签名缺陷", confidence: 95 };
  }
  if (text.includes("用药") || text.includes("剂量")) {
    return { category: "用药缺陷", confidence: 90 };
  }
  if (text.includes("主诉") || text.includes("缺失")) {
    return { category: "内容缺失", confidence: 88 };
  }
  return { category: "其他缺陷", confidence: 80 };
}

/**
 * 构建分类报告。
 *
 * @param results 分类结果数组
 * @returns 分类报告（total + avgConfidence + categories）
 */
export function buildClassifyReport(results: AiDefectClassifyResultDetailV14[]): AiDefectClassifyReportDetailV14 {
  if (results.length === 0) {
    return { total: 0, avgConfidence: 0, categories: [] };
  }
  // 手算报告：total=length，avgConfidence=Math.round(sum/length)，categories=去重类别
  const sum = results.reduce((acc, r) => acc + r.confidence, 0);
  const avgConfidence = Math.round(sum / results.length);
  const categories = [...new Set(results.map((r) => r.category))];
  return { total: results.length, avgConfidence, categories };
}
