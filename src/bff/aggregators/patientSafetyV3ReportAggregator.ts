/**
 * 健澜科技 jlmedaios - 患者安全 V3 纯函数（M256-A 深化）
 *
 * buildPatientSafetyV3Report / analyzeRootCauseV3 / assessSafetyCultureV3
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 分析根因 V3（纯函数）。
 *
 * @param event 事件
 * @returns 根因
 */
export function analyzeRootCauseV3(event: { type: string; description: string }): { rootCause: string; level: string; action: string } {
  let rootCause = "系统问题";
  let level = "I级";
  let action = "立即整改";
  if (event.type === "跌倒") {
    rootCause = "环境地面湿滑";
    level = "II级";
    action = "增设防滑标识";
  } else if (event.type === "用药错误") {
    rootCause = "药品名称相似混淆";
    level = "I级";
    action = "药品分区管理";
  }
  return { rootCause, level, action };
}

/**
 * 评估安全文化 V3（纯函数）。
 *
 * @param surveys 调查
 * @returns 文化
 */
export function assessSafetyCultureV3(surveys: { response: number; positive: number; justCulture: number }): { score: number; adequate: boolean } {
  const score = Math.round((surveys.positive / Math.max(surveys.response, 1)) * 100);
  const justScore = surveys.justCulture;
  const overall = Math.round((score + justScore) / 2);
  return { score: overall, adequate: overall >= 80 };
}

/** 患者安全 V3 报告输出 */
export interface PatientSafetyV3Report {
  timeRange: string;
  incident: { total: number; level1: number; level2: number; level3: number; level4: number; rca: number };
  goals: { id: number; surgery: number; medication: number; infection: number; fall: number; pressure: number; transfusion: number };
  culture: { justCulture: number; nonPunitive: number; anonymous: number; feedback: number; learning: number };
  earlyWarning: { vte: number; mews: number; sepsis: number; allergy: number; critical: number; deterioration: number };
  highAlert: { list: number; doubleCheck: number; zone: number; label: number; prep: number; transport: number };
  surgerySafety: { timeout: number; signIn: number; signOut: number; siteMarkup: number; instrumentCount: number; ssi: number };
  dispute: { warning: number; complaint: number; claim: number; insurance: number; mediation: number };
  metrics: { aeRate: number; harmRate: number; nearMiss: number; hazard: number; rectification: number; cultureScore: number };
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
    incident: { total: 200, level1: 5, level2: 30, level3: 100, level4: 65, rca: 50 },
    goals: { id: 99, surgery: 98, medication: 97, infection: 95, fall: 90, pressure: 85, transfusion: 99 },
    culture: { justCulture: 80, nonPunitive: 85, anonymous: 90, feedback: 75, learning: 80 },
    earlyWarning: { vte: 200, mews: 500, sepsis: 100, allergy: 50, critical: 500, deterioration: 30 },
    highAlert: { list: 50, doubleCheck: 100, zone: 20, label: 100, prep: 95, transport: 90 },
    surgerySafety: { timeout: 99, signIn: 99, signOut: 98, siteMarkup: 100, instrumentCount: 100, ssi: 2 },
    dispute: { warning: 100, complaint: 50, claim: 10, insurance: 10, mediation: 5 },
    metrics: { aeRate: 0.2, harmRate: 0.05, nearMiss: 500, hazard: 200, rectification: 95, cultureScore: 80 },
    suggestions: ["降低不良事件率", "提升安全文化评分"],
  };
}
