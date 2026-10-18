/**
 * 健澜科技 jlmedaios - 质控缺陷案例库 V14 聚合器（M520-B）
 *
 * 纯函数：构建案例库基础数据 + 搜索案例 + 构建案例库报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 案例库基础数据 */
export interface DefectCaseLibraryV14 {
  category: string;
  totalCases: number;
}

/** 缺陷案例 */
export interface DefectCaseV14 {
  id: string;
  title: string;
  category: string;
}

/** 搜索结果中的匹配项 */
export interface DefectCaseMatchV14 {
  id: string;
  title: string;
}

/** 搜索结果 */
export interface DefectCaseSearchResultV14 {
  matched: DefectCaseMatchV14[];
  count: number;
}

/** 案例库报告 */
export interface DefectCaseLibraryReportV14 {
  count: number;
  firstCase: string;
}

/**
 * 构建案例库基础数据。
 *
 * @param category 分类
 * @param totalCases 案例总数
 * @returns 案例库基础数据
 */
export function buildDefectCaseLibrary(category: string, totalCases: number): DefectCaseLibraryV14 {
  return { category, totalCases };
}

/**
 * 搜索案例。
 * cases 中 title 或 category 包含 query 子串即匹配。
 *
 * @param query 搜索关键词
 * @param cases 案例列表
 * @returns 搜索结果（matched + count）
 */
export function searchDefectCases(query: string, cases: DefectCaseV14[]): DefectCaseSearchResultV14 {
  // 手算检查：cases 中 title 或 category 包含 query 子串即匹配
  const matched: DefectCaseMatchV14[] = [];
  for (const c of cases) {
    if (c.title.includes(query) || c.category.includes(query)) {
      matched.push({ id: c.id, title: c.title });
    }
  }
  return { matched, count: matched.length };
}

/**
 * 构建案例库报告。
 * firstCase=匹配列表第一项 title，空列表返回'无匹配案例'。
 *
 * @param result 搜索结果（只需 matched）
 * @returns 案例库报告（count + firstCase）
 */
export function buildDefectCaseLibraryReport(result: { matched: DefectCaseMatchV14[]; count?: number }): DefectCaseLibraryReportV14 {
  // 手算：firstCase=匹配列表第一项 title，空列表返回'无匹配案例'
  const firstCase = result.matched.length > 0 ? result.matched[0].title : "无匹配案例";
  return { count: result.matched.length, firstCase };
}
