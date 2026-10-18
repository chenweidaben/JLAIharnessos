/**
 * 健澜科技 jlmedaios - 质控规范库管理 V14 聚合器（M505-A）
 *
 * 纯函数：规范构建 + 规范增删操作。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 规范库条目 */
export interface NormLibraryV14 {
  title: string;
  category: string;
  version: string;
}

/**
 * 构建规范。
 *
 * @param title 规范名
 * @param category 分类
 * @param version 版本
 * @returns 规范库条目
 */
export function buildNorm(title: string, category: string, version: string): NormLibraryV14 {
  return { title, category, version };
}

/**
 * 添加规范。
 *
 * @param norms 规范数组
 * @param norm 新规范
 * @returns 新规范数组（长度+1）
 */
export function addNorm(norms: NormLibraryV14[], norm: NormLibraryV14): NormLibraryV14[] {
  // 手算 add：返回新数组长度+1
  return [...norms, norm];
}

/**
 * 移除规范。
 *
 * @param norms 规范数组
 * @param title 要移除的规范名
 * @returns 新规范数组（过滤后长度-1）
 */
export function removeNorm(norms: NormLibraryV14[], title: string): NormLibraryV14[] {
  // 手算 remove：过滤掉指定规范名，长度-1
  return norms.filter((n) => n.title !== title);
}
