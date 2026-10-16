/**
 * 健澜科技 jlmedaios - 教学培训 V2 纯函数（M219-D）
 *
 * buildTeachingReportV2 / assessTeachingQuality / trackCMECredits
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估教学质量（纯函数）。
 *
 * @param evaluations 教学评估平均分（0-100）
 * @returns 等级
 */
export function assessTeachingQuality(evaluations: number): { score: number; level: string } {
  let level = '一般';
  if (evaluations >= 90) level = '优秀';
  else if (evaluations < 70) level = '待改进';
  return { score: evaluations, level };
}

/**
 * 追踪继教学分（纯函数）。
 *
 * @param staff 职工数
 * @param credits 总学分
 * @returns 人均学分
 */
export function trackCMECredits(staff: number, credits: number): { avgCredits: number; compliance: boolean } {
  const avgCredits = staff > 0 ? Math.round((credits / staff) * 10) / 10 : 0;
  return { avgCredits, compliance: avgCredits >= 25 };
}

/** 教学培训 V2 报告输出 */
export interface TeachingReportV2 {
  timeRange: string;
  residency: { bases: number; trainees: number };
  graduate: { programs: number; students: number };
  cme: { credits: number };
  postGrad: { fellowship: number };
  preJob: { sessions: number };
  faculty: { teachers: number };
  quality: { score: number };
  hospital: { clinicalCollege: boolean };
  suggestions: string[];
}

/**
 * 构建教学培训 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 教学培训 V2 报告
 */
export function buildTeachingReportV2(timeRange: string): TeachingReportV2 {
  return {
    timeRange,
    residency: { bases: 5, trainees: 200 },
    graduate: { programs: 10, students: 150 },
    cme: { credits: 30 },
    postGrad: { fellowship: 20 },
    preJob: { sessions: 12 },
    faculty: { teachers: 100 },
    quality: { score: 92 },
    hospital: { clinicalCollege: true },
    suggestions: ['加强师资培训', '提高教学比赛成绩'],
  };
}
