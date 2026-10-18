/**
 * 健澜科技 jlmedaios - 质控数据字典管理 V14 聚合器（M498-C）
 *
 * 纯函数：数据字典构建 + 字典关键词搜索。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 数据字典 */
export interface DataDictV14 {
  category: string;
  items: string[];
}

/**
 * 构建数据字典。
 *
 * @param category 分类
 * @param items 词条数组
 * @returns 数据字典
 */
export function buildDataDict(category: string, items: string[]): DataDictV14 {
  return { category, items };
}

/**
 * 按关键词搜索字典（category 或 items 数组中任一元素包含 keyword）。
 *
 * @param dicts 字典数组
 * @param keyword 关键词
 * @returns 搜索后的字典数组
 */
export function searchDataDict(dicts: DataDictV14[], keyword: string): DataDictV14[] {
  // 手算搜索：category 或 items 数组中任一元素包含 keyword 即匹配
  return dicts.filter(
    (dict) => dict.category.includes(keyword) || dict.items.some((item) => item.includes(keyword)),
  );
}
