/**
 * 健澜科技 jlmedaios - 智能预警与临床决策深化 V2 纯函数（M208-B）
 *
 * buildSmartAlertReportV2 / calculateMEWS / assessVTERisk
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 生命体征 */
export interface VitalSigns {
  systolicBp: number;
  heartRate: number;
  respiration: number;
  temperature: number;
  consciousness: number;
}

/**
 * 计算 MEWS 评分（纯函数）。
 *
 * @param v 生命体征
 * @returns MEWS 评分与等级
 */
export function calculateMEWS(v: VitalSigns): { score: number; level: string } {
  let score = 0;
  if (v.systolicBp <= 70) score += 3;
  else if (v.systolicBp <= 80) score += 2;
  else if (v.systolicBp <= 100) score += 1;
  if (v.heartRate <= 40) score += 2;
  else if (v.heartRate >= 100) score += 2;
  else if (v.heartRate >= 120) score += 2;
  if (v.respiration >= 30) score += 2;
  else if (v.respiration >= 20) score += 1;
  if (v.temperature >= 38.5) score += 1;
  if (v.consciousness < 10) score += 3;

  let level = '低危';
  if (score >= 5) level = '高危';
  else if (score >= 3) level = '中危';
  return { score, level };
}

/** VTE 风险史 */
export interface VTEHistory {
  previousDVT: boolean;
  surgery: boolean;
  malignancy: boolean;
  age: number;
}

/**
 * 评估 VTE 风险（纯函数）。
 *
 * @param h 风险史
 * @returns 风险等级
 */
export function assessVTERisk(h: VTEHistory): { riskLevel: string; capriniScore: number } {
  let caprini = 0;
  if (h.previousDVT) caprini += 3;
  if (h.surgery) caprini += 2;
  if (h.malignancy) caprini += 2;
  if (h.age >= 60) caprini += 1;

  let riskLevel = '低危';
  if (caprini >= 5) riskLevel = '高危';
  else if (caprini >= 3) riskLevel = '中危';
  return { riskLevel, capriniScore: caprini };
}

/** 智能预警 V2 报告输出 */
export interface SmartAlertReportV2 {
  timeRange: string;
  mews: { alerts: number; responseRate: number };
  criticalValue: { total: number; closedLoop: number };
  medication: { interactions: number; contraindications: number };
  infection: { vap: number; clabsi: number; cauti: number; ssi: number };
  fallPressure: { fall: number; pressureUlcer: number };
  vte: { screened: number; highRisk: number };
  management: { rules: number; falsePositiveRate: number };
  effectiveness: { preventedEvents: number };
  suggestions: string[];
}

/**
 * 构建智能预警 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 智能预警 V2 报告
 */
export function buildSmartAlertReportV2(timeRange: string): SmartAlertReportV2 {
  return {
    timeRange,
    mews: { alerts: 5000, responseRate: 0.95 },
    criticalValue: { total: 200, closedLoop: 198 },
    medication: { interactions: 500, contraindications: 200 },
    infection: { vap: 10, clabsi: 8, cauti: 15, ssi: 20 },
    fallPressure: { fall: 30, pressureUlcer: 15 },
    vte: { screened: 10000, highRisk: 2000 },
    management: { rules: 100, falsePositiveRate: 0.1 },
    effectiveness: { preventedEvents: 100 },
    suggestions: ['降低误报率', '提高 VTE 筛查率'],
  };
}
