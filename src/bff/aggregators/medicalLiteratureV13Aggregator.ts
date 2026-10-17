/**
 * 健澜科技 jlmedaios - 医学文献检索 V13 纯函数（M327-D）
 *
 * countMonthlySearchesV13 / countExportCitationsV13 / listHotKeywordsV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 文献检索记录 */
export interface LiteratureSearchV13 {
  keyword: string;
  isExported: boolean;
}

/** 热点词云项 */
export interface HotKeywordV13 {
  keyword: string;
  count: number;
}

/**
 * 本月检索次数（纯函数）：总数。
 *
 * @param searches 检索记录列表
 * @returns 检索次数
 */
export function countMonthlySearchesV13(searches: LiteratureSearchV13[]): number {
  return searches.length;
}

/**
 * 导出引用数（纯函数）：统计导出次数。
 *
 * @param searches 检索记录列表
 * @returns 导出引用数
 */
export function countExportCitationsV13(searches: LiteratureSearchV13[]): number {
  return searches.filter((s) => s.isExported).length;
}

/**
 * 热点词云（纯函数）：按检索频次排序 Top5。
 *
 * @param searches 检索记录列表
 * @returns 热点词云列表
 */
export function listHotKeywordsV13(searches: LiteratureSearchV13[]): HotKeywordV13[] {
  const map = new Map<string, number>();
  for (const s of searches) {
    map.set(s.keyword, (map.get(s.keyword) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}
