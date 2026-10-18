/**
 * 健澜科技 jlmedaios - AI病历缺陷根因分析 V14 聚合器（M522-C）
 *
 * 纯函数：构建根因分析基础数据 + 根因分析 + 构建根因报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 根因分析基础数据 */
export interface AiDefectRootCauseV14 {
  defectId: string;
  defectType: string;
}

/** 根因分析输入 */
export interface AiDefectRootCauseInputV14 {
  defectType: string;
  freq: number;
  severity: string;
}

/** 根因分析结果 */
export interface AiDefectRootCauseResultV14 {
  rootCause: string;
  confidence: number;
}

/** 根因报告 */
export interface AiDefectRootCauseReportV14 {
  rootCause: string;
  confidence: number;
}

/**
 * 构建根因分析基础数据。
 *
 * @param defectId 缺陷ID
 * @param defectType 缺陷类型
 * @returns 根因分析基础数据
 */
export function buildAiDefectRootCause(defectId: string, defectType: string): AiDefectRootCauseV14 {
  return { defectId, defectType };
}

/**
 * 根因分析。
 * freq >= 10 → rootCause='系统流程缺陷'；>= 5 → '操作习惯问题'；否则 '偶发因素'。
 * confidence = Math.min(0.9, 0.5 + freq × 0.03)。
 *
 * @param input 根因分析输入（缺陷类型/发生频次/严重级别）
 * @returns 根因分析结果（rootCause + confidence）
 */
export function analyzeRootCause(input: AiDefectRootCauseInputV14): AiDefectRootCauseResultV14 {
  // 手算：freq >= 10 → '系统流程缺陷'
  // 测试2：freq=15 >= 10 → rootCause='系统流程缺陷'
  // 手算：freq >= 5 → '操作习惯问题'
  // 测试3：freq=7 >= 5 且 < 10 → rootCause='操作习惯问题'
  // 手算：否则 → '偶发因素'
  // 测试4：freq=2 < 5 → rootCause='偶发因素'
  let rootCause: string;
  if (input.freq >= 10) {
    rootCause = "系统流程缺陷";
  } else if (input.freq >= 5) {
    rootCause = "操作习惯问题";
  } else {
    rootCause = "偶发因素";
  }
  // 手算：confidence = Math.min(0.9, 0.5 + freq × 0.03)
  // 测试2：Math.min(0.9, 0.5 + 15×0.03) = Math.min(0.9, 0.95) = 0.9
  // 测试3：0.5 + 7×0.03 = 0.5 + 0.21 = 0.71
  // 测试4：0.5 + 2×0.03 = 0.5 + 0.06 = 0.56
  const confidence = Math.min(0.9, 0.5 + input.freq * 0.03);
  return { rootCause, confidence };
}

/**
 * 构建根因报告。
 *
 * @param result 根因分析结果
 * @returns 根因报告（rootCause + confidence）
 */
export function buildAiDefectRootCauseReport(result: AiDefectRootCauseResultV14): AiDefectRootCauseReportV14 {
  return { rootCause: result.rootCause, confidence: result.confidence };
}
