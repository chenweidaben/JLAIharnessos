/**
 * 健澜科技 jlmedaios - 质控法律法规 V14 聚合器（M505-D，M505 收官）
 *
 * 纯函数：法规构建 + 法规搜索 + 报告构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 法律法规条目 */
export interface RegulationV14 {
  title: string;
  level: string;
  publishDate: string;
}

/** 法规报告 */
export interface RegulationReportV14 {
  resultCount: number;
  results: RegulationV14[];
}

/**
 * 构建法律法规。
 *
 * @param title 法规名
 * @param level 层级（法律/行政法规/部门规章）
 * @param publishDate 发布日期
 * @returns 法律法规条目
 */
export function buildRegulation(title: string, level: string, publishDate: string): RegulationV14 {
  return { title, level, publishDate };
}

/**
 * 搜索法律法规。
 *
 * @param regs 法规数组
 * @param keyword 关键词
 * @returns 匹配的法规数组（title 包含 keyword）
 */
export function searchRegulation(regs: RegulationV14[], keyword: string): RegulationV14[] {
  // 手算搜索：title 字段包含 keyword 即匹配
  return regs.filter((r) => r.title.includes(keyword));
}

/**
 * 构建法规报告。
 *
 * @param results 搜索结果数组
 * @returns 法规报告（resultCount + results）
 */
export function buildRegulationReport(results: RegulationV14[]): RegulationReportV14 {
  return {
    resultCount: results.length,
    results,
  };
}
