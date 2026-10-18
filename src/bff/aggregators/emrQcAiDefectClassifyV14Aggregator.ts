/**
 * 健澜科技 jlmedaios - 质控 AI 缺陷自动分类 V14 聚合器（M499-A）
 *
 * 纯函数：AI 缺陷关键词分类 + 分类报告构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 分类结果 */
export interface ClassifyResultV14 {
  category: string;
  confidence: number;
}

/** 分类报告 */
export interface ClassifyReportV14 {
  category: string;
  confidence: number;
  level: string;
}

/**
 * AI 缺陷自动分类（按关键词匹配）。
 *
 * @param text 缺陷描述文本
 * @returns 分类结果（category + confidence）
 */
export function classifyDefect(text: string): ClassifyResultV14 {
  // 手算分类逻辑：按关键词包含匹配分类
  // - 包含"主诉" → 主诉缺失，confidence 0.9
  // - 包含"时限"/"超时" → 时效违规，confidence 0.85
  // - 包含"术语"/"不规范" → 术语问题，confidence 0.8
  // - 默认 → 其他缺陷，confidence 0.5
  if (text.includes("主诉")) {
    return { category: "主诉缺失", confidence: 0.9 };
  }
  if (text.includes("时限") || text.includes("超时")) {
    return { category: "时效违规", confidence: 0.85 };
  }
  if (text.includes("术语") || text.includes("不规范")) {
    return { category: "术语问题", confidence: 0.8 };
  }
  return { category: "其他缺陷", confidence: 0.5 };
}

/**
 * 构建分类报告。
 *
 * @param result 分类结果
 * @returns 分类报告（category + confidence + level）
 */
export function buildClassifyReport(result: ClassifyResultV14): ClassifyReportV14 {
  // 手算 level：confidence >= 0.8 为高置信度，>= 0.6 为中置信度，否则低置信度
  let level = "低置信度";
  if (result.confidence >= 0.8) {
    level = "高置信度";
  } else if (result.confidence >= 0.6) {
    level = "中置信度";
  }
  return {
    category: result.category,
    confidence: result.confidence,
    level,
  };
}
