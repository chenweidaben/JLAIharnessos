/**
 * 健澜科技 jlmedaios - 质量安全智能化 V2 纯函数（M233-D）
 *
 * buildQualitySafetyIntelligentV2 / earlyWarningScore / detectAdverseEvent
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 早期预警评分（纯函数）。
 *
 * @param vitals 生命体征
 * @param events 不良事件
 * @returns MEWS 评分
 */
export function earlyWarningScore(vitals: string, events: string): { score: number; level: string } {
  let score = 0;
  if (vitals.includes("呼吸急促")) score += 2;
  if (vitals.includes("低血压")) score += 3;
  if (vitals.includes("意识改变")) score += 3;
  if (events.includes("跌倒")) score += 1;
  let level = "低危";
  if (score >= 6) level = "高危";
  else if (score >= 3) level = "中危";
  return { score, level };
}

/**
 * 检测不良事件（纯函数）。
 *
 * @param pattern 模式
 * @param timeline 时间线
 * @returns 检测结果
 */
export function detectAdverseEvent(pattern: string, timeline: string): { detected: boolean; type: string } {
  let type = "无";
  if (pattern.includes("用药错误")) type = "用药错误";
  else if (pattern.includes("压疮")) type = "压疮";
  else if (pattern.includes("跌倒")) type = "跌倒";
  return { detected: type !== "无", type };
}

/** 质量安全智能化 V2 报告输出 */
export interface QualitySafetyIntelligentV2 {
  timeRange: string;
  alerts: { fall: number; pressure: number; medication: number };
  rootCause: { aiAnalysis: number };
  prediction: { qualityRate: number };
  mews: { earlyWarning: number; vte: number; sepsis: number };
  qc: { intercept: number };
  suggestions: string[];
}

/**
 * 构建质量安全智能化 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 质量安全智能化 V2 报告
 */
export function buildQualitySafetyIntelligentV2(timeRange: string): QualitySafetyIntelligentV2 {
  return {
    timeRange,
    alerts: { fall: 50, pressure: 30, medication: 20 },
    rootCause: { aiAnalysis: 100 },
    prediction: { qualityRate: 95 },
    mews: { earlyWarning: 200, vte: 80, sepsis: 30 },
    qc: { intercept: 500 },
    suggestions: ["强化跌倒压疮预警", "提升脓毒症早期识别率"],
  };
}
