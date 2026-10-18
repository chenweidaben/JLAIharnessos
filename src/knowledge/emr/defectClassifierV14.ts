/**
 * 健澜科技 jlmedaios - 病历缺陷自动分类知识库 V14（M470-C）
 *
 * 纯数据+纯函数：4 类缺陷分类 + 关键词匹配分类 + 置信度计算。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 缺陷分类 */
export interface DefectCategoryV14 {
  category: string;
  keywords: string[];
}

/** 分类结果 */
export interface ClassificationResultV14 {
  category: string;
  confidence: number;
}

/** 缺陷分类汇总 */
export interface ClassificationSummaryV14 {
  total: number;
  categories: Record<string, number>;
}

/** 内置缺陷分类（4 类） */
export const DEFECT_CATEGORIES_V14: DefectCategoryV14[] = [
  { category: "完整性缺失", keywords: ["主诉", "现病史", "缺失", "未写"] },
  { category: "逻辑矛盾", keywords: ["矛盾", "不符", "不一致"] },
  { category: "时限超时", keywords: ["超时", "逾期", "超过"] },
  { category: "表述不规范", keywords: ["口语", "随意", "不规范"] },
];

/**
 * 按关键词匹配自动分类缺陷文本。
 * 遍历 categories，text includes 任一 keyword 即命中该类；
 * confidence = 命中关键词数 / 该类总关键词数（保留 1 位小数）；
 * 无命中返回 { category: '未分类', confidence: 0 }。
 *
 * @param text 缺陷文本
 * @returns 分类结果
 */
export function classifyDefect(text: string): ClassificationResultV14 {
  for (const cat of DEFECT_CATEGORIES_V14) {
    const hitCount = cat.keywords.filter((kw) => text.includes(kw)).length;
    if (hitCount > 0) {
      const confidence = Math.round((hitCount / cat.keywords.length) * 10) / 10;
      return { category: cat.category, confidence };
    }
  }
  return { category: "未分类", confidence: 0 };
}

/**
 * 汇总分类结果。
 *
 * @param results 分类结果列表
 * @returns 汇总
 */
export function buildClassificationSummary(
  results: ClassificationResultV14[],
): ClassificationSummaryV14 {
  const categories: Record<string, number> = {};
  for (const r of results) {
    categories[r.category] = (categories[r.category] ?? 0) + 1;
  }
  return { total: results.length, categories };
}
