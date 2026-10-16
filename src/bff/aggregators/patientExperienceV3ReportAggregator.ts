/**
 * 健澜科技 jlmedaios - 患者体验 V3 纯函数（M241-D）
 *
 * buildPatientExperienceV3Report / calculateNPSV3 / trackPatientJourneyV3
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 计算 NPS V3（纯函数）。
 *
 * @param promoters 推荐者
 * @param detractors 贬损者
 * @returns NPS
 */
export function calculateNPSV3(promoters: number, detractors: number): { nps: number; level: string } {
  const total = promoters + detractors;
  let nps = Math.round(((promoters - detractors) / total) * 100);
  let level = "一般";
  if (nps >= 50) level = "优秀";
  else if (nps >= 30) level = "良好";
  return { nps, level };
}

/**
 * 追踪患者旅程 V3（纯函数）。
 *
 * @param step 步骤
 * @param feedback 反馈
 * @returns 旅程
 */
export function trackPatientJourneyV3(step: string, feedback: { score: number; complaint: boolean }): { step: string; satisfaction: number; closed: boolean } {
  return { step, satisfaction: feedback.score, closed: !feedback.complaint };
}

/** 患者体验 V3 报告输出 */
export interface PatientExperienceV3Report {
  timeRange: string;
  journey: { booking: number; consultation: number; discharge: number; followup: number };
  satisfaction: { opd: number; ipd: number; or: number; tech: number };
  nps: { promoters: number; detractors: number };
  complaint: { total: number; closed: number };
  suggestions: string[];
}

/**
 * 构建患者体验 V3 报告。
 *
 * @param timeRange 时间范围
 * @returns 患者体验 V3 报告
 */
export function buildPatientExperienceV3Report(timeRange: string): PatientExperienceV3Report {
  return {
    timeRange,
    journey: { booking: 10000, consultation: 10000, discharge: 2000, followup: 8000 },
    satisfaction: { opd: 90, ipd: 92, or: 95, tech: 88 },
    nps: { promoters: 7000, detractors: 500 },
    complaint: { total: 100, closed: 95 },
    suggestions: ["提升门诊满意度", "缩短预约等待时间"],
  };
}
