/**
 * 健澜科技 jlmedaios - 员工体验 V2 纯函数（M218-B）
 *
 * buildEmployeeExperienceReportV2 / calculateEngagementScore / assessWorkload
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 计算敬业度分数（纯函数）。
 *
 * @param surveys 调研平均分（0-100）
 * @returns 敬业度
 */
export function calculateEngagementScore(surveys: number): { score: number; level: string } {
  let level = '一般';
  if (surveys >= 80) level = '高';
  else if (surveys < 60) level = '低';
  return { score: surveys, level };
}

/**
 * 评估工作负荷（纯函数）。
 *
 * @param burden 工作负荷
 * @param capacity 产能
 * @returns 是否过载
 */
export function assessWorkload(burden: number, capacity: number): { overloaded: boolean; ratio: number } {
  const ratio = capacity > 0 ? burden / capacity : 0;
  return { overloaded: ratio > 1, ratio };
}

/** 员工体验 V2 报告输出 */
export interface EmployeeExperienceReportV2 {
  timeRange: string;
  onboarding: { days30: number; days90: number };
  environment: { satisfaction: number };
  career: { promotionRate: number };
  compensation: { satisfaction: number };
  workload: { avg: number };
  eap: { sessions: number };
  culture: { score: number };
  alumni: { network: number };
  suggestions: string[];
}

/**
 * 构建员工体验 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 员工体验 V2 报告
 */
export function buildEmployeeExperienceReportV2(timeRange: string): EmployeeExperienceReportV2 {
  return {
    timeRange,
    onboarding: { days30: 100, days90: 95 },
    environment: { satisfaction: 80 },
    career: { promotionRate: 0.15 },
    compensation: { satisfaction: 75 },
    workload: { avg: 0.9 },
    eap: { sessions: 30 },
    culture: { score: 82 },
    alumni: { network: 500 },
    suggestions: ['减轻工作负荷', '增加 EAP 关怀'],
  };
}
