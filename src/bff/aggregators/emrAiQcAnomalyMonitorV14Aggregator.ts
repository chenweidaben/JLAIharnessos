/**
 * 健澜科技 jlmedaios - 病历AI质控异常监控 V14 聚合器（M549-B）
 *
 * 纯函数：构建 AI 异常监控基础数据 + AI 异常监控 + 构建异常监控报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 异常监控基础数据 */
export interface AiQcAnomalyMonitorV14 {
  recordId: string;
  dept: string;
}

/** AI 异常监控输入 */
export interface AiQcAnomalyMonitorInputV14 {
  currentDefect: number;
  avgDefect: number;
}

/** AI 异常监控结果 */
export interface AiQcAnomalyMonitorResultV14 {
  isAnomaly: boolean;
  deviation: number;
}

/** 异常监控报告 */
export interface AiQcAnomalyMonitorReportV14 {
  isAnomaly: boolean;
  deviation: number;
}

/**
 * 构建 AI 异常监控基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 异常监控基础数据
 */
export function buildAiQcAnomalyMonitor(recordId: string, dept: string): AiQcAnomalyMonitorV14 {
  return { recordId, dept };
}

/**
 * AI 异常监控。
 * deviation = Math.round((currentDefect - avgDefect) / avgDefect * 1000) / 10
 * isAnomaly = Math.abs(deviation) > 50
 *
 * @param input 异常监控输入（当前缺陷数 + 历史平均缺陷数）
 * @returns 异常监控结果（isAnomaly + deviation）
 */
export function monitorQcAnomalyByAi(input: AiQcAnomalyMonitorInputV14): AiQcAnomalyMonitorResultV14 {
  // 手算：deviation = Math.round((currentDefect - avgDefect) / avgDefect * 1000) / 10
  // 测试2：currentDefect=15, avgDefect=5 → (15-5)/5*1000 = 10/5*1000 = 2000 → Math.round(2000)=2000 → 2000/10 = 200.0
  // 测试3：currentDefect=6, avgDefect=5 → (6-5)/5*1000 = 1/5*1000 = 200 → Math.round(200)=200 → 200/10 = 20.0
  const deviation = Math.round(((input.currentDefect - input.avgDefect) / input.avgDefect) * 1000) / 10;
  // 手算：isAnomaly = Math.abs(deviation) > 50
  // 测试2：|200.0|=200 > 50 → isAnomaly=true
  // 测试3：|20.0|=20 <= 50 → isAnomaly=false
  const isAnomaly = Math.abs(deviation) > 50;
  return { isAnomaly, deviation };
}

/**
 * 构建异常监控报告。
 *
 * @param result 异常监控结果
 * @returns 异常监控报告（isAnomaly + deviation 透传）
 */
export function buildAiQcAnomalyMonitorReport(result: AiQcAnomalyMonitorResultV14): AiQcAnomalyMonitorReportV14 {
  // 手算：透传 isAnomaly + deviation
  // 测试4：{isAnomaly=true, deviation=200.0} → 透传
  return { isAnomaly: result.isAnomaly, deviation: result.deviation };
}
