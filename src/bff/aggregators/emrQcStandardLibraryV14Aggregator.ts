/**
 * 健澜科技 jlmedaios - 质控行业标准库 V14 聚合器（M520-C）
 *
 * 纯函数：构建标准库基础数据 + 搜索标准 + 构建标准库报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 标准库基础数据 */
export interface StandardLibraryV14 {
  category: string;
  totalStandards: number;
}

/** 行业标准 */
export interface StandardV14 {
  id: string;
  title: string;
  issuer: string;
}

/** 搜索结果中的匹配项 */
export interface StandardMatchV14 {
  id: string;
  title: string;
}

/** 搜索结果 */
export interface StandardSearchResultV14 {
  matched: StandardMatchV14[];
  count: number;
}

/** 标准库报告 */
export interface StandardLibraryReportV14 {
  count: number;
  firstStandard: string;
}

/**
 * 构建标准库基础数据。
 *
 * @param category 分类
 * @param totalStandards 标准总数
 * @returns 标准库基础数据
 */
export function buildStandardLibrary(category: string, totalStandards: number): StandardLibraryV14 {
  return { category, totalStandards };
}

/**
 * 搜索标准。
 * standards 中 title 或 issuer 包含 query 子串即匹配。
 *
 * @param query 搜索关键词
 * @param standards 标准列表
 * @returns 搜索结果（matched + count）
 */
export function searchStandards(query: string, standards: StandardV14[]): StandardSearchResultV14 {
  // 手算检查：standards 中 title 或 issuer 包含 query 子串即匹配
  const matched: StandardMatchV14[] = [];
  for (const s of standards) {
    if (s.title.includes(query) || s.issuer.includes(query)) {
      matched.push({ id: s.id, title: s.title });
    }
  }
  return { matched, count: matched.length };
}

/**
 * 构建标准库报告。
 * firstStandard=匹配列表第一项 title，空列表返回'无匹配标准'。
 *
 * @param result 搜索结果（只需 matched）
 * @returns 标准库报告（count + firstStandard）
 */
export function buildStandardLibraryReport(result: { matched: StandardMatchV14[]; count?: number }): StandardLibraryReportV14 {
  // 手算：firstStandard=匹配列表第一项 title，空列表返回'无匹配标准'
  const firstStandard = result.matched.length > 0 ? result.matched[0].title : "无匹配标准";
  return { count: result.matched.length, firstStandard };
}
