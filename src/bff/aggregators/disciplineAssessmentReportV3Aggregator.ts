/**
 * 健澜科技 jlmedaios - 学科评估 V3 纯函数（M230-D）
 *
 * buildDisciplineAssessmentReportV3 / assessDisciplineRanking / compareDiscipline
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估学科排名（纯函数）。
 *
 * @param metrics 指标得分
 * @returns 排名等级
 */
export function assessDisciplineRanking(metrics: number): { rank: number; level: string } {
  let level = 'B';
  if (metrics >= 90) level = 'A+';
  else if (metrics >= 80) level = 'A';
  else if (metrics >= 70) level = 'B+';
  return { rank: Math.round(100 - metrics), level };
}

/**
 * 对比学科（纯函数）。
 *
 * @param ours 我院得分
 * @param benchmark 标杆得分
 * @returns 差距
 */
export function compareDiscipline(ours: number, benchmark: number): { gap: number; behind: boolean } {
  const gap = Math.round((benchmark - ours) * 10) / 10;
  return { gap, behind: gap > 0 };
}

/** 学科评估 V3 报告输出 */
export interface DisciplineAssessmentReportV3 {
  timeRange: string;
  fudan: { reputation: number };
  stem: { ranking: number };
  techValue: { score: number };
  national: { keySpecialties: number };
  indicators: { total: number };
  projects: { construction: number };
  benchmark: { partners: number };
  improvement: { plans: number };
  suggestions: string[];
}

/**
 * 构建学科评估 V3 报告。
 *
 * @param timeRange 时间范围
 * @returns 学科评估 V3 报告
 */
export function buildDisciplineAssessmentReportV3(timeRange: string): DisciplineAssessmentReportV3 {
  return {
    timeRange,
    fudan: { reputation: 15 },
    stem: { ranking: 50 },
    techValue: { score: 80 },
    national: { keySpecialties: 3 },
    indicators: { total: 20 },
    projects: { construction: 10 },
    benchmark: { partners: 5 },
    improvement: { plans: 8 },
    suggestions: ['提升复旦专科声誉排名', '加强国家临床重点专科建设'],
  };
}
