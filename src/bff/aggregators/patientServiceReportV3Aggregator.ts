/**
 * 健澜科技 jlmedaios - 患者服务深化 V3 纯函数（M206-A）
 *
 * buildPatientServiceReportV3 / calculateNPS / classifyComplaintType
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 计算 NPS（净推荐值）（纯函数）。
 *
 * @param promoters 推荐者数
 * @param detractors 贬损者数
 * @param total 总样本
 * @returns NPS 值
 */
export function calculateNPS(promoters: number, detractors: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round(((promoters - detractors) / total) * 100);
}

/** 投诉数据 */
export interface ComplaintData {
  channel: string;
  category: string;
}

/**
 * 投诉分类（纯函数）。
 *
 * @param complaint 投诉数据
 * @returns 分类与优先级
 */
export function classifyComplaintType(complaint: ComplaintData): { type: string; priority: string } {
  if (complaint.category.includes('医疗') || complaint.category.includes('安全')) {
    return { type: '医疗安全类', priority: '高' };
  }
  if (complaint.category.includes('服务') || complaint.channel.includes('热线')) {
    return { type: '服务态度类', priority: '中' };
  }
  return { type: '其他类', priority: '低' };
}

/** 患者服务 V3 报告输出 */
export interface PatientServiceReportV3 {
  timeRange: string;
  appointment: { outpatient: number; expert: number; exam: number; fulfillmentRate: number };
  visit: { smartTriage: number; checkIn: number; avgWaitMin: number; oneStopCenter: boolean };
  convenience: { wheelchair: number; interpreter: number };
  complaint: { total: number; resolved: number; satisfaction: number };
  nps: { promoters: number; detractors: number; total: number };
  followup: { completed: number };
  education: { sessions: number };
  volunteer: { hours: number };
  suggestions: string[];
}

/**
 * 构建患者服务 V3 报告。
 *
 * @param timeRange 时间范围
 * @returns 患者服务 V3 报告
 */
export function buildPatientServiceReportV3(timeRange: string): PatientServiceReportV3 {
  return {
    timeRange,
    appointment: { outpatient: 100000, expert: 20000, exam: 30000, fulfillmentRate: 0.95 },
    visit: { smartTriage: 80000, checkIn: 100000, avgWaitMin: 20, oneStopCenter: true },
    convenience: { wheelchair: 500, interpreter: 100 },
    complaint: { total: 200, resolved: 190, satisfaction: 0.9 },
    nps: { promoters: 600, detractors: 100, total: 1000 },
    followup: { completed: 5000 },
    education: { sessions: 200 },
    volunteer: { hours: 1000 },
    suggestions: ['缩短候诊时间', '提高 NPS 得分'],
  };
}
