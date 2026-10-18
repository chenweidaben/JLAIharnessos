/**
 * 健澜科技 jlmedaios - 质控专家库管理 V14 聚合器（M502-A）
 *
 * 纯函数：专家信息构建 + 专家库增删操作。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 专家信息 */
export interface ExpertLibraryV14 {
  name: string;
  dept: string;
  specialty: string;
}

/**
 * 构建专家信息。
 *
 * @param name 专家姓名
 * @param dept 科室
 * @param specialty 专业方向
 * @returns 专家信息
 */
export function buildExpertLibrary(name: string, dept: string, specialty: string): ExpertLibraryV14 {
  return { name, dept, specialty };
}

/**
 * 添加专家到库。
 *
 * @param library 专家库数组
 * @param expert 新专家
 * @returns 新专家库数组（长度+1）
 */
export function addExpert(library: ExpertLibraryV14[], expert: ExpertLibraryV14): ExpertLibraryV14[] {
  // 手算 add：返回新数组长度+1
  return [...library, expert];
}

/**
 * 从库中移除专家。
 *
 * @param library 专家库数组
 * @param name 要移除的专家姓名
 * @returns 新专家库数组（过滤后长度-1）
 */
export function removeExpert(library: ExpertLibraryV14[], name: string): ExpertLibraryV14[] {
  // 手算 remove：过滤掉指定姓名的专家，长度-1
  return library.filter((e) => e.name !== name);
}
