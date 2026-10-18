/**
 * 健澜科技 jlmedaios - 质控数据字典管理明细 V14 聚合器（M507-C，-detail 避让）
 *
 * 纯函数：数据字典构建 + 添加字典 + 移除字典。
 * 避让说明：M473-A 已有 emrQcDataDictV14，本切片改用 -detail 后缀避让。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 数据字典条目 */
export interface DataDictDetailV14 {
  type: string;
  code: string;
  label: string;
}

/**
 * 构建数据字典。
 *
 * @param type 字典类型
 * @param code 字典编码
 * @param label 字典标签
 * @returns 数据字典
 */
export function buildDict(type: string, code: string, label: string): DataDictDetailV14 {
  return { type, code, label };
}

/**
 * 添加字典。
 *
 * @param dicts 字典数组
 * @param dict 新字典
 * @returns 新字典数组（长度+1）
 */
export function addDict(dicts: DataDictDetailV14[], dict: DataDictDetailV14): DataDictDetailV14[] {
  // 手算 add：返回新数组长度+1
  return [...dicts, dict];
}

/**
 * 移除字典（按 code 过滤）。
 *
 * @param dicts 字典数组
 * @param code 要移除的字典编码
 * @returns 新字典数组（过滤后长度-1）
 */
export function removeDict(dicts: DataDictDetailV14[], code: string): DataDictDetailV14[] {
  // 手算 remove：按 code 过滤，长度-1
  return dicts.filter((d) => d.code !== code);
}
