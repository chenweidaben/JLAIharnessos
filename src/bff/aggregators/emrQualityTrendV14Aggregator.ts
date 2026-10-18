/**
 * 健澜科技 jlmedaios - 病历质量趋势分析 V14 聚合器（M536-B）
 *
 * 纯函数：构建趋势分析基础数据 + 趋势分析 + 构建趋势报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 趋势分析基础数据 */
export interface QualityTrendV14 {
  dept: string;
  year: number;
}

/** 趋势分析输入 */
export interface QualityTrendInputV14 {
  scores: number[];
}

/** 趋势分析结果 */
export interface QualityTrendResultV14 {
  avgScore: number;
  trend: string;
}

/** 趋势分析报告 */
export interface QualityTrendReportV14 {
  avgScore: number;
  trend: string;
}

/**
 * 构建趋势分析基础数据。
 *
 * @param dept 科室
 * @param year 年份
 * @returns 趋势分析基础数据
 */
export function buildQualityTrend(dept: string, year: number): QualityTrendV14 {
  return { dept, year };
}

/**
 * 趋势分析。
 * avgScore = Math.round(scores.reduce((a,b)=>a+b,0)/scores.length * 10) / 10（保留1位小数）
 * trend = scores[last] > scores[first] ? '上升' : scores[last] < scores[first] ? '下降' : '平稳'
 *
 * @param input 分析输入（月度得分列表）
 * @returns 分析结果（avgScore + trend）
 */
export function analyzeQualityTrend(input: QualityTrendInputV14): QualityTrendResultV14 {
  // 手算：avgScore = Math.round(总分 / 个数 * 10) / 10
  // 测试2：scores=[85,88,92] → 总分=265, 个数=3 → Math.round(265/3*10)/10 = Math.round(88.333*10)/10 = Math.round(883.33)/10 = 883/10 = 88.3
  // 测试3：scores=[92,88,85] → 总分=265, 个数=3 → avgScore=88.3
  const total = input.scores.reduce((a: number, b: number) => a + b, 0);
  const avgScore = Math.round((total / input.scores.length) * 10) / 10;
  // 手算：trend = 末值 vs 首值
  // 测试2：scores[last]=92 > scores[first]=85 → '上升'
  // 测试3：scores[last]=85 < scores[first]=92 → '下降'
  const first = input.scores[0] ?? 0;
  const last = input.scores[input.scores.length - 1] ?? 0;
  const trend = last > first ? "上升" : last < first ? "下降" : "平稳";
  return { avgScore, trend };
}

/**
 * 构建趋势报告。
 *
 * @param result 分析结果
 * @returns 趋势报告（avgScore + trend 透传）
 */
export function buildQualityTrendReport(result: QualityTrendResultV14): QualityTrendReportV14 {
  // 手算：透传 avgScore + trend
  // 测试4：{avgScore=88.3, trend='上升'} → avgScore=88.3, trend='上升'
  return { avgScore: result.avgScore, trend: result.trend };
}
