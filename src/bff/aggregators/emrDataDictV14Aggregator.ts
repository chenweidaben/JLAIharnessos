/**
 * 健澜科技 jlmedaios - 病历质控数据字典管理 V14 聚合器（M473-A）
 *
 * 纯函数：创建字典项 + 按标签关键词搜索。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 数据字典项 */
export interface DataDictV14 {
  id: string;
  category: string;
  code: string;
  label: string;
}

/**
 * 创建字典项。
 *
 * @param category 分类
 * @param code 编码
 * @param label 标签
 * @returns 字典项
 */
export function buildDataDict(category: string, code: string, label: string): DataDictV14 {
  return {
    id: `DD-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    category,
    code,
    label,
  };
}

/**
 * 按 label includes 关键词过滤字典项。
 *
 * @param items 字典列表
 * @param keyword 搜索关键词
 * @returns 匹配的字典项
 */
export function searchDictItems(items: DataDictV14[], keyword: string): DataDictV14[] {
  if (!keyword.trim()) return items;
  return items.filter((item) => item.label.includes(keyword));
}
