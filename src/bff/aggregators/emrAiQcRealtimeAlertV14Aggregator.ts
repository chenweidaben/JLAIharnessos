/**
 * 健澜科技 jlmedaios - 病历AI质控实时预警 V14 聚合器（M549-A）
 *
 * 纯函数：构建 AI 实时预警基础数据 + AI 实时预警检查 + 构建实时预警报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 实时预警基础数据 */
export interface AiQcRealtimeAlertV14 {
  recordId: string;
  dept: string;
}

/** AI 实时预警检查输入 */
export interface AiQcRealtimeAlertInputV14 {
  defectCount: number;
  threshold: number;
}

/** AI 实时预警检查结果 */
export interface AiQcRealtimeAlertResultV14 {
  triggered: boolean;
  level: string;
}

/** 实时预警报告 */
export interface AiQcRealtimeAlertReportV14 {
  triggered: boolean;
  level: string;
}

/**
 * 构建 AI 实时预警基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 实时预警基础数据
 */
export function buildAiQcRealtimeAlert(recordId: string, dept: string): AiQcRealtimeAlertV14 {
  return { recordId, dept };
}

/**
 * AI 实时预警检查。
 * triggered = defectCount > threshold
 * level = triggered ? (defectCount > threshold * 2 ? '红色' : '橙色') : '绿色'
 *
 * @param input 预警检查输入（缺陷数 + 预警阈值）
 * @returns 预警检查结果（triggered + level）
 */
export function checkQcRealtimeAlertByAi(input: AiQcRealtimeAlertInputV14): AiQcRealtimeAlertResultV14 {
  // 手算：triggered = defectCount > threshold
  // 测试2：defectCount=20, threshold=5 → 20>5 → triggered=true
  // 测试3：defectCount=3, threshold=5 → 3<=5 → triggered=false
  const triggered = input.defectCount > input.threshold;
  // 手算：level = triggered ? (defectCount > threshold * 2 ? '红色' : '橙色') : '绿色'
  // 测试2：triggered=true；defectCount=20 > threshold*2=10 → level='红色'
  // 测试3：triggered=false → level='绿色'
  const level = triggered ? (input.defectCount > input.threshold * 2 ? "红色" : "橙色") : "绿色";
  return { triggered, level };
}

/**
 * 构建实时预警报告。
 *
 * @param result 预警检查结果
 * @returns 实时预警报告（triggered + level 透传）
 */
export function buildAiQcRealtimeAlertReport(result: AiQcRealtimeAlertResultV14): AiQcRealtimeAlertReportV14 {
  // 手算：透传 triggered + level
  // 测试4：{triggered=true, level='红色'} → 透传
  return { triggered: result.triggered, level: result.level };
}
