/**
 * 健澜科技 jlmedaios - 病历AI质控趋势预测 V14 聚合器（M549-D，M549 收官）
 *
 * 纯函数：构建 AI 趋势预测基础数据 + AI 趋势预测 + 构建趋势预测报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 趋势预测基础数据 */
export interface AiQcTrendForecastV14 {
  recordId: string;
  dept: string;
}

/** AI 趋势预测输入 */
export interface AiQcTrendForecastInputV14 {
  currentPassRate: number;
  monthlyImprove: number;
}

/** AI 趋势预测结果 */
export interface AiQcTrendForecastResultV14 {
  nextMonthRate: number;
  direction: string;
}

/** 趋势预测报告 */
export interface AiQcTrendForecastReportV14 {
  nextMonthRate: number;
  direction: string;
}

/**
 * 构建 AI 趋势预测基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 趋势预测基础数据
 */
export function buildAiQcTrendForecast(recordId: string, dept: string): AiQcTrendForecastV14 {
  return { recordId, dept };
}

/**
 * AI 趋势预测。
 * nextMonthRate = Math.min(100, Math.round((currentPassRate + monthlyImprove) * 10) / 10)
 * direction = nextMonthRate > currentPassRate ? '上升' : nextMonthRate < currentPassRate ? '下降' : '持平'
 *
 * @param input 趋势预测输入（当前合格率 + 月改善幅度）
 * @returns 趋势预测结果（nextMonthRate + direction）
 */
export function forecastQcTrendByAi(input: AiQcTrendForecastInputV14): AiQcTrendForecastResultV14 {
  // 手算：nextMonthRate = Math.min(100, Math.round((currentPassRate + monthlyImprove) * 10) / 10)
  // 测试2：currentPassRate=85.0, monthlyImprove=3.5 → 85.0+3.5=88.5 → Math.round(88.5*10)=Math.round(885)=885 → 885/10=88.5 → Math.min(100, 88.5)=88.5
  // 测试3：currentPassRate=90.0, monthlyImprove=-2.0 → 90.0-2.0=88.0 → Math.round(88.0*10)=Math.round(880)=880 → 880/10=88.0 → Math.min(100, 88.0)=88.0
  const nextMonthRate = Math.min(100, Math.round((input.currentPassRate + input.monthlyImprove) * 10) / 10);
  // 手算：direction = nextMonthRate > currentPassRate ? '上升' : nextMonthRate < currentPassRate ? '下降' : '持平'
  // 测试2：nextMonthRate=88.5 > currentPassRate=85.0 → direction='上升'
  // 测试3：nextMonthRate=88.0 < currentPassRate=90.0 → direction='下降'
  const direction = nextMonthRate > input.currentPassRate ? "上升" : nextMonthRate < input.currentPassRate ? "下降" : "持平";
  return { nextMonthRate, direction };
}

/**
 * 构建趋势预测报告。
 *
 * @param result 趋势预测结果
 * @returns 趋势预测报告（nextMonthRate + direction 透传）
 */
export function buildAiQcTrendForecastReport(result: AiQcTrendForecastResultV14): AiQcTrendForecastReportV14 {
  // 手算：透传 nextMonthRate + direction
  // 测试4：{nextMonthRate=88.5, direction='上升'} → 透传
  return { nextMonthRate: result.nextMonthRate, direction: result.direction };
}
