/**
 * 健澜科技 jlmedaios - 患者服务 V4 纯函数（M253-A）
 *
 * buildPatientServiceV4Report / assessPatientSatisfactionV4 / trackPatientJourneyV4
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估患者满意度 V4（纯函数）。
 *
 * @param surveys 问卷
 * @returns 满意度
 */
export function assessPatientSatisfactionV4(surveys: { score: number; count: number; nps: number }): { satisfaction: number; nps: number; adequate: boolean } {
  const satisfaction = Math.round((surveys.score / Math.max(surveys.count, 1)) * 100);
  return { satisfaction, nps: surveys.nps, adequate: satisfaction >= 90 };
}

/**
 * 追踪患者旅程 V4（纯函数）。
 *
 * @param step 步骤
 * @param feedback 反馈
 * @returns 追踪
 */
export function trackPatientJourneyV4(step: string, feedback: { rating: number; comment: string }): { step: string; rating: number; issue: boolean; action: string } {
  const issue = feedback.rating < 3;
  return { step, rating: feedback.rating, issue, action: issue ? "立即回访改进" : "保持" };
}

/** 患者服务 V4 报告输出 */
export interface PatientServiceV4Report {
  timeRange: string;
  booking: { appointment: number; noShow: number; channels: number; cancel: number };
  visit: { triage: number; guide: number; companion: number; wait: number };
  convenience: { wheelchair: number; stroller: number; water: number; wifi: number };
  complaint: { intake: number; process: number; followup: number; closedLoop: number };
  followup: { discharge: number; chronic: number; postop: number; aiCall: number };
  education: { admission: number; preop: number; medication: number; video: number };
  volunteer: { post: number; hours: number; training: number; recognition: number };
  nps: { outpatient: number; inpatient: number; emergency: number; nursing: number };
  suggestions: string[];
}

/**
 * 构建患者服务 V4 报告。
 *
 * @param timeRange 时间范围
 * @returns 患者服务 V4 报告
 */
export function buildPatientServiceV4Report(timeRange: string): PatientServiceV4Report {
  return {
    timeRange,
    booking: { appointment: 80, noShow: 10, channels: 5, cancel: 5 },
    visit: { triage: 5000, guide: 3000, companion: 500, wait: 20 },
    convenience: { wheelchair: 200, stroller: 50, water: 1000, wifi: 95 },
    complaint: { intake: 200, process: 190, followup: 180, closedLoop: 95 },
    followup: { discharge: 2000, chronic: 1000, postop: 500, aiCall: 1500 },
    education: { admission: 1000, preop: 500, medication: 3000, video: 800 },
    volunteer: { post: 50, hours: 5000, training: 30, recognition: 20 },
    nps: { outpatient: 60, inpatient: 70, emergency: 55, nursing: 75 },
    suggestions: ["降低爽约率", "提升 NPS"],
  };
}
