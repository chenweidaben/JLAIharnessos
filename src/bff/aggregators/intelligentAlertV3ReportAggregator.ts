/**
 * 健澜科技 jlmedaios - 智能预警 V3 纯函数（M255-B）
 *
 * buildIntelligentAlertV3Report / calculateEarlyWarningV3 / assessVTERiskV3
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 计算早期预警 V3（纯函数）。
 *
 * @param vitals 生命体征
 * @param events 事件
 * @returns 预警
 */
export function calculateEarlyWarningV3(vitals: { hr: number; rr: number; spo2: number; sbp: number }, events: number): { score: number; level: string; urgent: boolean } {
  let score = 0;
  if (vitals.hr > 100) score += 2;
  if (vitals.rr > 20) score += 2;
  if (vitals.spo2 < 93) score += 3;
  if (vitals.sbp < 90) score += 3;
  score += events;
  let level = "低危";
  let urgent = false;
  if (score >= 7) { level = "高危"; urgent = true; }
  else if (score >= 4) level = "中危";
  return { score, level, urgent };
}

/**
 * 评估 VTE 风险 V3（纯函数）。
 *
 * @param score 评分
 * @param type 类型
 * @returns VTE 风险
 */
export function assessVTERiskV3(score: number, type: "Caprini" | "Padua" | "Autar"): { risk: string; preventive: boolean } {
  let risk = "低危";
  if (type === "Caprini" && score >= 5) risk = "高危";
  else if (type === "Padua" && score >= 4) risk = "高危";
  else if (type === "Autar" && score >= 15) risk = "高危";
  return { risk, preventive: risk === "高危" };
}

/** 智能预警 V3 报告输出 */
export interface IntelligentAlertV3Report {
  timeRange: string;
  earlyWarning: { mews: number; news2: number; pews: number; pediatric: number; obstetric: number };
  critical: { lab: number; imaging: number; ecg: number; closedLoop: number };
  vte: { caprini: number; padua: number; autar: number; prevention: number; bleeding: number };
  infection: { handHygiene: number; mdro: number; ssi: number; vap: number; clabsi: number; cauti: number };
  deterioration: { arrest: number; sepsis: number; respiratoryFailure: number; shock: number; mof: number };
  medication: { highAlert: number; allergy: number; interaction: number; duplication: number; doseError: number };
  safety: { fall: number; pressureUlcer: number; nutrition: number; skin: number };
  management: { rule: number; threshold: number; notify: number; closedLoop: number; falsePositive: number; fatigue: number };
  suggestions: string[];
}

/**
 * 构建智能预警 V3 报告。
 *
 * @param timeRange 时间范围
 * @returns 智能预警 V3 报告
 */
export function buildIntelligentAlertV3Report(timeRange: string): IntelligentAlertV3Report {
  return {
    timeRange,
    earlyWarning: { mews: 1000, news2: 800, pews: 200, pediatric: 300, obstetric: 150 },
    critical: { lab: 500, imaging: 100, ecg: 50, closedLoop: 98 },
    vte: { caprini: 2000, padua: 1000, autar: 500, prevention: 1500, bleeding: 50 },
    infection: { handHygiene: 95, mdro: 30, ssi: 20, vap: 10, clabsi: 15, cauti: 25 },
    deterioration: { arrest: 20, sepsis: 100, respiratoryFailure: 50, shock: 30, mof: 10 },
    medication: { highAlert: 500, allergy: 50, interaction: 100, duplication: 80, doseError: 20 },
    safety: { fall: 100, pressureUlcer: 50, nutrition: 200, skin: 150 },
    management: { rule: 500, threshold: 100, notify: 5000, closedLoop: 95, falsePositive: 10, fatigue: 20 },
    suggestions: ["降低误报率", "提升危急值闭环率"],
  };
}
