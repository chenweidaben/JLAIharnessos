/**
 * 健澜科技 jlmedaios - 病历AI不良事件主动识别 V14 聚合器（M559-A）
 *
 * 纯函数：构建 AI 不良事件主动识别基础数据 + AI 不良事件主动识别 + 构建不良事件主动识别报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 不良事件主动识别基础数据 */
export interface AiAdverseEventDetectV14 {
  recordId: string;
  dept: string;
}

/** AI 不良事件主动识别输入 */
export interface AiAdverseEventDetectInputV14 {
  hasFall: boolean;
  hasPressureUlcer: boolean;
  hasMedError: boolean;
  hasInfection: boolean;
}

/** AI 不良事件主动识别结果 */
export interface AiAdverseEventDetectResultV14 {
  eventCount: number;
  level: string;
}

/** 不良事件主动识别报告 */
export interface AiAdverseEventDetectReportV14 {
  eventCount: number;
  level: string;
}

/**
 * 构建 AI 不良事件主动识别基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 不良事件主动识别基础数据
 */
export function buildAiAdverseEventDetect(recordId: string, dept: string): AiAdverseEventDetectV14 {
  return { recordId, dept };
}

/**
 * AI 不良事件主动识别。
 * eventCount = (hasFall?1:0) + (hasPressureUlcer?1:0) + (hasMedError?1:0) + (hasInfection?1:0)
 * level = eventCount >= 2 ? '严重不良事件' : eventCount === 1 ? '一般不良事件' : '无不良事件'
 *
 * @param input 不良事件识别输入（跌倒/压疮/用药错误/感染 4 项布尔）
 * @returns 不良事件识别结果（eventCount + level）
 */
export function detectAdverseEventByAi(input: AiAdverseEventDetectInputV14): AiAdverseEventDetectResultV14 {
  // 手算：eventCount = (hasFall?1:0) + (hasPressureUlcer?1:0) + (hasMedError?1:0) + (hasInfection?1:0)
  // 测试2：4 项全 false → 0+0+0+0 = 0
  // 测试3：hasFall=true, hasPressureUlcer=true → 1+1+0+0 = 2
  const eventCount = (input.hasFall ? 1 : 0)
    + (input.hasPressureUlcer ? 1 : 0)
    + (input.hasMedError ? 1 : 0)
    + (input.hasInfection ? 1 : 0);
  // 手算：level = eventCount >= 2 ? '严重不良事件' : eventCount === 1 ? '一般不良事件' : '无不良事件'
  // 测试2：eventCount=0 → '无不良事件'
  // 测试3：eventCount=2 >= 2 → '严重不良事件'
  const level = eventCount >= 2 ? "严重不良事件" : eventCount === 1 ? "一般不良事件" : "无不良事件";
  return { eventCount, level };
}

/**
 * 构建不良事件主动识别报告。
 *
 * @param result 不良事件识别结果
 * @returns 不良事件识别报告（eventCount + level 透传）
 */
export function buildAiAdverseEventDetectReport(result: AiAdverseEventDetectResultV14): AiAdverseEventDetectReportV14 {
  // 手算：透传 eventCount + level
  // 测试4：{eventCount=0, level='无不良事件'} → 透传
  return { eventCount: result.eventCount, level: result.level };
}
