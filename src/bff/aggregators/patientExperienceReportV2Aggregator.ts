/**
 * 健澜科技 jlmedaios - 患者体验 V2 纯函数（M218-A）
 *
 * buildPatientExperienceReportV2 / calculatePatientNPS / trackPatientJourneyStep
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 计算患者 NPS（纯函数）。
 *
 * @param promoters 推荐者
 * @param detractors 贬损者
 * @returns NPS
 */
export function calculatePatientNPS(promoters: number, detractors: number): { nps: number; level: string } {
  const total = promoters + detractors;
  const nps = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;
  let level = '一般';
  if (nps >= 50) level = '优秀';
  else if (nps < 0) level = '待改进';
  return { nps, level };
}

/**
 * 追踪患者旅程步骤（纯函数）。
 *
 * @param step 步骤
 * @param feedback 反馈数
 * @returns 满意度
 */
export function trackPatientJourneyStep(step: string, feedback: number): { step: string; satisfaction: number } {
  return { step, satisfaction: Math.min(100, Math.max(0, 100 - feedback * 5)) };
}

/** 患者体验 V2 报告输出 */
export interface PatientExperienceReportV2 {
  timeRange: string;
  journey: { steps: number; avgSatisfaction: number };
  satisfaction: { score: number };
  nps: { score: number };
  complaints: { total: number; resolved: number };
  education: { materials: number };
  engagement: { sharedDecision: number };
  accessibility: { ramp: boolean; signLanguage: boolean };
  concierge: { services: number };
  suggestions: string[];
}

/**
 * 构建患者体验 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 患者体验 V2 报告
 */
export function buildPatientExperienceReportV2(timeRange: string): PatientExperienceReportV2 {
  return {
    timeRange,
    journey: { steps: 7, avgSatisfaction: 92 },
    satisfaction: { score: 92 },
    nps: { score: 45 },
    complaints: { total: 50, resolved: 48 },
    education: { materials: 200 },
    engagement: { sharedDecision: 30 },
    accessibility: { ramp: true, signLanguage: false },
    concierge: { services: 10 },
    suggestions: ['增加手语服务', '优化候诊体验'],
  };
}
