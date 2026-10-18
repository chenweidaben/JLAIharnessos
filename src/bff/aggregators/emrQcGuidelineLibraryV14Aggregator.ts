/**
 * 健澜科技 jlmedaios - 质控指南库 V14 聚合器（M505-C）
 *
 * 纯函数：指南构建 + 专科筛选。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 指南条目 */
export interface GuidelineLibraryV14 {
  title: string;
  specialty: string;
  year: number;
}

/**
 * 构建指南。
 *
 * @param title 指南名
 * @param specialty 专科
 * @param year 年份
 * @returns 指南条目
 */
export function buildGuideline(title: string, specialty: string, year: number): GuidelineLibraryV14 {
  return { title, specialty, year };
}

/**
 * 按专科筛选指南。
 *
 * @param guidelines 指南数组
 * @param specialty 专科关键词
 * @returns 匹配的指南数组（specialty 精确匹配）
 */
export function filterGuidelines(guidelines: GuidelineLibraryV14[], specialty: string): GuidelineLibraryV14[] {
  // 手算筛选：specialty 字段精确匹配
  return guidelines.filter((g) => g.specialty === specialty);
}
