/**
 * 健澜科技 jlmedaios - 患者体验监测与改进 V5 纯函数（M270-D）
 *
 * buildPatientExperienceV5Report / calculateNPSV5 / analyzeJourneyV5
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/**
 * 计算NPS V5（纯函数）。
 *
 * @param promoters 推荐者
 * @param detractors 贬损者
 * @returns NPS
 */
export function calculateNPSV5(promoters: number, detractors: number): { nps: number; category: string; trend: string } {
  const total = promoters + detractors;
  const nps = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;
  let category = "一般";
  if (nps >= 50) {
    category = "优秀";
  } else if (nps >= 30) {
    category = "良好";
  } else if (nps < 0) {
    category = "危险";
  }
  let trend = "稳定";
  if (nps > 20) {
    trend = "上升";
  } else if (nps < -10) {
    trend = "下降";
  }
  return { nps, category, trend };
}

/**
 * 旅程分析 V5（纯函数）。
 *
 * @param touchpoints 触点
 * @returns 旅程分析
 */
export function analyzeJourneyV5(touchpoints: { name: string; satisfaction: number; painPoint: boolean }[]): { avg: number; painPoints: string[]; overall: string } {
  const avg = Math.round(touchpoints.reduce((sum, t) => sum + t.satisfaction, 0) / Math.max(touchpoints.length, 1));
  const painPoints = touchpoints.filter((t) => t.painPoint).map((t) => t.name);
  let overall = "良好";
  if (avg < 70) {
    overall = "待改进";
  } else if (avg >= 90) {
    overall = "优秀";
  }
  return { avg, painPoints, overall };
}

/** 患者体验监测与改进 V5 报告输出 */
export interface PatientExperienceV5Report {
  timeRange: string;
  satisfaction: { outpatient: number; inpatient: number; er: number; medTech: number; nursing: number; logistics: number; overall: number; realtime: number };
  nps: { promoters: number; passives: number; detractors: number; trend: number; byDept: number };
  badReview: { realtimeAlert: number; reason: number; remediation: number; returnVisit: number; rootCause: number; pdca: number };
  journey: { keyTouchpoint: number; satisfaction: number; painPoint: number; delight: number; journeyMap: number; breakpoint: number };
  complaint: { classification: number; grading: number; processing: number; deadline: number; returnVisit: number; rootCause: number; improvement: number; notification: number };
  serviceStar: { praise: number; serviceStar: number; caseShare: number; incentive: number };
  improvement: { project: number; owner: number; progress: number; effect: number; roi: number; continuous: number };
  metrics: { satisfaction: number; nps: number; complaintRate: number; badReviewClosure: number; improvementCompletion: number };
  suggestions: string[];
}

/**
 * 构建患者体验监测与改进 V5 报告。
 *
 * @param timeRange 时间范围
 * @returns 患者体验监测与改进 V5 报告
 */
export function buildPatientExperienceV5Report(timeRange: string): PatientExperienceV5Report {
  return {
    timeRange,
    satisfaction: { outpatient: 88, inpatient: 92, er: 85, medTech: 86, nursing: 90, logistics: 80, overall: 88, realtime: 75 },
    nps: { promoters: 300, passives: 150, detractors: 50, trend: 10, byDept: 20 },
    badReview: { realtimeAlert: 95, reason: 85, remediation: 90, returnVisit: 80, rootCause: 75, pdca: 70 },
    journey: { keyTouchpoint: 12, satisfaction: 88, painPoint: 5, delight: 3, journeyMap: 80, breakpoint: 5 },
    complaint: { classification: 90, grading: 85, processing: 90, deadline: 95, returnVisit: 85, rootCause: 80, improvement: 75, notification: 90 },
    serviceStar: { praise: 200, serviceStar: 50, caseShare: 30, incentive: 80 },
    improvement: { project: 20, owner: 100, progress: 75, effect: 70, roi: 60, continuous: 80 },
    metrics: { satisfaction: 88, nps: 50, complaintRate: 5, badReviewClosure: 90, improvementCompletion: 75 },
    suggestions: ["降低投诉率", "提升差评闭环率"],
  };
}
