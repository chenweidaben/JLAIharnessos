/**
 * 健澜科技 jlmedaios - 患者服务智能化 V2 纯函数（M233-A）
 *
 * buildPatientServiceIntelligentV2 / aiTriagePatient / predictPatientRisk
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * AI 智能导诊（纯函数）。
 *
 * @param symptoms 症状
 * @returns 推荐科室
 */
export function aiTriagePatient(symptoms: string): { department: string; confidence: number } {
  if (symptoms.includes("胸痛") || symptoms.includes("胸闷")) return { department: "心血管内科", confidence: 95 };
  if (symptoms.includes("腹痛") || symptoms.includes("腹泻")) return { department: "消化内科", confidence: 88 };
  return { department: "全科", confidence: 60 };
}

/**
 * 预测患者风险（纯函数）。
 *
 * @param history 既往史
 * @param conditions 当前体征
 * @returns 风险等级
 */
export function predictPatientRisk(history: string, conditions: string): { level: string; score: number } {
  let score = 20;
  if (history.includes("糖尿病")) score += 30;
  if (conditions.includes("发热")) score += 20;
  if (conditions.includes("低血压")) score += 20;
  let level = "低";
  if (score >= 70) level = "高";
  else if (score >= 40) level = "中";
  return { level, score };
}

/** 患者服务智能化 V2 报告输出 */
export interface PatientServiceIntelligentV2 {
  timeRange: string;
  preTriage: { sessions: number; accuracy: number };
  guidance: { triages: number; satisfaction: number };
  healthPortrait: { profiles: number };
  assistant: { qa24h: number };
  appointment: { smartBooked: number; changed: number };
  insurance: { settled: number };
  education: { articles: number };
  followup: { aiCalls: number };
  suggestions: string[];
}

/**
 * 构建患者服务智能化 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 患者服务智能化 V2 报告
 */
export function buildPatientServiceIntelligentV2(timeRange: string): PatientServiceIntelligentV2 {
  return {
    timeRange,
    preTriage: { sessions: 10000, accuracy: 92 },
    guidance: { triages: 8000, satisfaction: 88 },
    healthPortrait: { profiles: 50000 },
    assistant: { qa24h: 30000 },
    appointment: { smartBooked: 20000, changed: 3000 },
    insurance: { settled: 15000 },
    education: { articles: 500 },
    followup: { aiCalls: 10000 },
    suggestions: ["提升 AI 导诊准确率", "扩大智能随访外呼覆盖"],
  };
}
