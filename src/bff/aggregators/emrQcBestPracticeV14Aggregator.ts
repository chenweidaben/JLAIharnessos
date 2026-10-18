/**
 * 健澜科技 jlmedaios - 质控最佳实践库 V14 聚合器（M520-D，M520 收官）
 *
 * 纯函数：构建最佳实践库基础数据 + 搜索最佳实践 + 构建最佳实践报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 最佳实践库基础数据 */
export interface BestPracticeV14 {
  category: string;
  totalPractices: number;
}

/** 最佳实践条目 */
export interface BestPracticeItemV14 {
  id: string;
  title: string;
  hospital: string;
}

/** 搜索结果中的匹配项 */
export interface BestPracticeMatchV14 {
  id: string;
  title: string;
}

/** 搜索结果 */
export interface BestPracticeSearchResultV14 {
  matched: BestPracticeMatchV14[];
  count: number;
}

/** 最佳实践报告 */
export interface BestPracticeReportV14 {
  count: number;
  firstPractice: string;
}

/**
 * 构建最佳实践库基础数据。
 *
 * @param category 分类
 * @param totalPractices 实践总数
 * @returns 最佳实践库基础数据
 */
export function buildBestPractice(category: string, totalPractices: number): BestPracticeV14 {
  return { category, totalPractices };
}

/**
 * 搜索最佳实践。
 * practices 中 title 或 hospital 包含 query 子串即匹配。
 *
 * @param query 搜索关键词
 * @param practices 实践列表
 * @returns 搜索结果（matched + count）
 */
export function searchBestPractices(query: string, practices: BestPracticeItemV14[]): BestPracticeSearchResultV14 {
  // 手算检查：practices 中 title 或 hospital 包含 query 子串即匹配
  const matched: BestPracticeMatchV14[] = [];
  for (const p of practices) {
    if (p.title.includes(query) || p.hospital.includes(query)) {
      matched.push({ id: p.id, title: p.title });
    }
  }
  return { matched, count: matched.length };
}

/**
 * 构建最佳实践报告。
 * firstPractice=匹配列表第一项 title，空列表返回'无匹配实践'。
 *
 * @param result 搜索结果（只需 matched）
 * @returns 最佳实践报告（count + firstPractice）
 */
export function buildBestPracticeReport(result: { matched: BestPracticeMatchV14[]; count?: number }): BestPracticeReportV14 {
  // 手算：firstPractice=匹配列表第一项 title，空列表返回'无匹配实践'
  const firstPractice = result.matched.length > 0 ? result.matched[0].title : "无匹配实践";
  return { count: result.matched.length, firstPractice };
}
