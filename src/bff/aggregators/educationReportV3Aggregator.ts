/**
 * 健澜科技 jlmedaios - 教学培训深化 V3 纯函数（M207-C）
 *
 * buildEducationReportV3 / assessTeachingQuality / trackCMECredits
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估教学质量（纯函数）。
 *
 * @param feedback 满意度反馈（0-1）
 * @param scores 考核平均分
 * @returns 质量评估
 */
export function assessTeachingQuality(feedback: number, scores: number): { level: string; pass: boolean } {
  const avg = (feedback + scores / 100) / 2;
  let level = '不合格';
  if (avg >= 0.9) level = '优秀';
  else if (avg >= 0.8) level = '良好';
  else if (avg >= 0.7) level = '合格';
  return { level, pass: avg >= 0.7 };
}

/** 继续教育人员 */
export interface CMEStaff {
  name: string;
  requiredCredits: number;
  earnedCredits: number;
}

/**
 * 追踪继续教育学分（纯函数）。
 *
 * @param staff 人员列表
 * @returns 达标率
 */
export function trackCMECredits(staff: CMEStaff[]): { total: number; compliant: number; complianceRate: number } {
  const total = staff.length;
  const compliant = staff.filter((s) => s.earnedCredits >= s.requiredCredits).length;
  return { total, compliant, complianceRate: total > 0 ? compliant / total : 0 };
}

/** 教学 V3 报告输出 */
export interface EducationReportV3 {
  timeRange: string;
  residency: { enrolled: number; rotated: number; examined: number; graduated: number };
  graduate: { master: number; doctor: number };
  cme: { total: number; complianceRate: number };
  preJob: { trainees: number };
  specialtyCert: { nurses: number };
  activities: { lectures: number; rounds: number };
  quality: { score: number };
  resources: { osce: number; simulationCenter: boolean };
  suggestions: string[];
}

/**
 * 构建教学 V3 报告。
 *
 * @param timeRange 时间范围
 * @returns 教学 V3 报告
 */
export function buildEducationReportV3(timeRange: string): EducationReportV3 {
  return {
    timeRange,
    residency: { enrolled: 200, rotated: 200, examined: 180, graduated: 50 },
    graduate: { master: 100, doctor: 30 },
    cme: { total: 2000, complianceRate: 0.85 },
    preJob: { trainees: 500 },
    specialtyCert: { nurses: 100 },
    activities: { lectures: 200, rounds: 50 },
    quality: { score: 85 },
    resources: { osce: 10, simulationCenter: true },
    suggestions: ['提高住培结业通过率', '扩大继教学分覆盖面'],
  };
}
