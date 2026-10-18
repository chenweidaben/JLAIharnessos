/**
 * 健澜科技 jlmedaios - 质控制度查询 V14 聚合器（M505-B）
 *
 * 纯函数：制度搜索 + 查询报告构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 制度条目 */
export interface PolicyItemV14 {
  title: string;
  content: string;
}

/** 查询报告 */
export interface PolicyReportV14 {
  resultCount: number;
  results: PolicyItemV14[];
}

/**
 * 搜索制度。
 *
 * @param policies 制度数组
 * @param keyword 关键词
 * @returns 匹配的制度数组（title 或 content 包含 keyword）
 */
export function searchPolicy(policies: PolicyItemV14[], keyword: string): PolicyItemV14[] {
  // 手算搜索：title 或 content 包含 keyword 即匹配
  return policies.filter(
    (p) => p.title.includes(keyword) || p.content.includes(keyword)
  );
}

/**
 * 构建查询报告。
 *
 * @param results 搜索结果数组
 * @returns 查询报告（resultCount + results）
 */
export function buildPolicyReport(results: PolicyItemV14[]): PolicyReportV14 {
  return {
    resultCount: results.length,
    results,
  };
}
