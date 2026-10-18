/**
 * 健澜科技 jlmedaios - 质控问题趋势分析（避让版）V14 聚合器（M542-D，M542 收官）
 *
 * 纯函数：构建质控趋势基础数据 + 趋势分析 + 构建趋势报告。
 * 避让说明：M475-A 已有 emrQcTrendAlertV14（-alert），M495-A 已有 emrQcTrendForecastV14（-forecast），本片采用 -analysis 后缀避让。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质控趋势基础数据 */
export interface QcTrendAnalysisV14 {
  dept: string;
  year: number;
}

/** 趋势分析输入 */
export interface QcTrendAnalysisInputV14 {
  monthlyDefects: number[];
}

/** 趋势分析结果 */
export interface QcTrendAnalysisResultV14 {
  avgDefects: number;
  trend: "上升" | "下降" | "平稳";
}

/** 趋势报告 */
export interface QcTrendAnalysisReportV14 {
  avgDefects: number;
  trend: string;
}

/**
 * 构建质控趋势基础数据。
 *
 * @param dept 科室
 * @param year 年份
 * @returns 质控趋势基础数据
 */
export function buildQcTrendAnalysis(dept: string, year: number): QcTrendAnalysisV14 {
  return { dept, year };
}

/**
 * 趋势分析。
 * avgDefects = monthlyDefects.length>0 ? Math.round(sum/monthlyDefects.length*10)/10 : 0
 * trend = 末月 > 首月 ? '上升' : 末月 < 首月 ? '下降' : '平稳'
 *
 * @param input 分析输入（月度缺陷数列表）
 * @returns 分析结果（avgDefects + trend）
 */
export function analyzeQcTrendAnalysis(input: QcTrendAnalysisInputV14): QcTrendAnalysisResultV14 {
  // 手算：avgDefects = monthlyDefects.length>0 ? Math.round(sum/len*10)/10 : 0
  // 测试2：[30,25,15] → sum=70, len=3 → 70/3=23.333... → *10=233.333... → Math.round=233 → /10=23.3
  // 测试3：[10,20,30] → sum=60, len=3 → 60/3=20 → *10=200 → Math.round=200 → /10=20.0
  const sum = input.monthlyDefects.reduce((a, b) => a + b, 0);
  const avgDefects = input.monthlyDefects.length > 0
    ? Math.round((sum / input.monthlyDefects.length) * 10) / 10
    : 0;
  // 手算：trend = 末月 > 首月 ? '上升' : 末月 < 首月 ? '下降' : '平稳'
  // 测试2：末月=15, 首月=30 → 15<30 → '下降'
  // 测试3：末月=30, 首月=10 → 30>10 → '上升'
  const first = input.monthlyDefects[0];
  const last = input.monthlyDefects[input.monthlyDefects.length - 1];
  const trend: "上升" | "下降" | "平稳" = last > first ? "上升" : last < first ? "下降" : "平稳";
  return { avgDefects, trend };
}

/**
 * 构建趋势报告。
 *
 * @param result 分析结果
 * @returns 趋势报告（avgDefects + trend 透传）
 */
export function buildQcTrendAnalysisReport(result: QcTrendAnalysisResultV14): QcTrendAnalysisReportV14 {
  // 手算：透传 avgDefects + trend
  // 测试4：{avgDefects=23.3, trend='下降'} → avgDefects=23.3, trend='下降'
  return { avgDefects: result.avgDefects, trend: result.trend };
}
