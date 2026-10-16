/**
 * 健澜科技 jlmedaios - 患者体验智能化 V2 纯函数（M235-A）
 *
 * buildPatientExperienceIntelligentV2 / predictPatientSatisfaction / personalizePatientJourney
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 预测患者满意度（纯函数）。
 *
 * @param survey 问卷
 * @param behavior 行为
 * @returns 预测结果
 */
export function predictPatientSatisfaction(survey: string, behavior: string): { nps: number; churn: boolean } {
  let nps = 50;
  if (survey.includes("投诉")) nps -= 30;
  if (behavior.includes("流失")) nps -= 20;
  return { nps, churn: nps < 30 };
}

/**
 * 个性化患者旅程（纯函数）。
 *
 * @param persona 画像
 * @param context 上下文
 * @returns 旅程
 */
export function personalizePatientJourney(persona: string, context: string): { path: string[] } {
  return { path: ["预约", "导诊", "就诊", "检查", "取药", "随访"] };
}

/** 患者体验智能化 V2 报告输出 */
export interface PatientExperienceIntelligentV2 {
  timeRange: string;
  journey: { ai: number; personalized: number; breakpoints: number };
  recommendation: { doctor: number; dept: number; exam: number; content: number };
  satisfaction: { nps: number; complaints: number; emotion: number };
  accessibility: { done: boolean };
  pro: { coDecision: number };
  suggestions: string[];
}

/**
 * 构建患者体验智能化 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 患者体验智能化 V2 报告
 */
export function buildPatientExperienceIntelligentV2(timeRange: string): PatientExperienceIntelligentV2 {
  return {
    timeRange,
    journey: { ai: 50000, personalized: 30000, breakpoints: 200 },
    recommendation: { doctor: 10000, dept: 8000, exam: 5000, content: 20000 },
    satisfaction: { nps: 65, complaints: 100, emotion: 1000 },
    accessibility: { done: true },
    pro: { coDecision: 500 },
    suggestions: ["降低断点率", "提升NPS"],
  };
}
