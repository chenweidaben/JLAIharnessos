/**
 * 健澜科技 jlmedaios - 患者安全 V3 纯函数（M241-A）
 *
 * buildPatientSafetyV3Report / analyzeRootCause / earlyWarningScoreV3
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 分析根因（纯函数）。
 *
 * @param event 事件
 * @returns 根因
 */
export function analyzeRootCause(event: string): { cause: string; level: string } {
  let cause = "系统因素";
  let level = "I";
  if (event.includes("用药错误")) { cause = "流程未执行双人核对"; level = "II"; }
  if (event.includes("跌倒")) { cause = "环境风险评估不足"; level = "III"; }
  return { cause, level };
}

/**
 * 早期预警评分 V3（纯函数）。
 *
 * @param vitals 生命体征
 * @param events 事件
 * @returns 评分
 */
export function earlyWarningScoreV3(vitals: { hr: number; bp: number; rr: number; temp: number; spo2: number }, events: string[]): { score: number; alert: boolean } {
  let score = 0;
  if (vitals.hr > 100) score += 2;
  if (vitals.bp < 90) score += 3;
  if (vitals.rr > 20) score += 2;
  if (vitals.spo2 < 92) score += 3;
  if (events.includes("脓毒症")) score += 4;
  return { score, alert: score >= 5 };
}

/** 患者安全 V3 报告输出 */
export interface PatientSafetyV3Report {
  timeRange: string;
  adverse: { gradeI: number; gradeII: number; gradeIII: number; gradeIV: number };
  highAlert: number;
  timeOut: number;
  earlyWarning: { mews: number; vte: number; sepsis: number };
  justCulture: boolean;
  suggestions: string[];
}

/**
 * 构建患者安全 V3 报告。
 *
 * @param timeRange 时间范围
 * @returns 患者安全 V3 报告
 */
export function buildPatientSafetyV3Report(timeRange: string): PatientSafetyV3Report {
  return {
    timeRange,
    adverse: { gradeI: 200, gradeII: 50, gradeIII: 10, gradeIV: 2 },
    highAlert: 1000,
    timeOut: 5000,
    earlyWarning: { mews: 200, vte: 500, sepsis: 50 },
    justCulture: true,
    suggestions: ["降低II级不良事件", "提高Time Out执行率"],
  };
}
