/**
 * 健澜科技 jlmedaios - 临床试验与真实世界研究纯函数（M202-D）
 *
 * buildClinicalResearchReport / calculateTrialEnrollmentRate / classifyAdverseEvent
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 计算试验入组率（纯函数）。
 *
 * @param target 目标入组数
 * @param enrolled 已入组数
 * @returns 入组率
 */
export function calculateTrialEnrollmentRate(target: number, enrolled: number): { rate: number; onTrack: boolean } {
  const rate = target > 0 ? enrolled / target : 0;
  const onTrack = rate >= 0.8;
  return { rate, onTrack };
}

/** 不良事件数据 */
export interface AdverseEventInput {
  severity: '轻度' | '中度' | '重度';
  serious: boolean;
  relationship: '肯定' | '很可能' | '可能' | '无关';
}

/**
 * 不良事件分类（纯函数）。
 *
 * @param ae 不良事件
 * @returns 分类
 */
export function classifyAdverseEvent(ae: AdverseEventInput): { category: string; reportable: boolean } {
  if (ae.serious) return { category: 'SAE 严重不良事件', reportable: true };
  if (ae.severity === '重度') return { category: '重度 AE', reportable: true };
  if (ae.relationship === '肯定' || ae.relationship === '很可能') return { category: '药物相关 AE', reportable: true };
  return { category: '一般 AE', reportable: false };
}

/** 临床研究报告输出 */
export interface ClinicalResearchReport {
  timeRange: string;
  trials: { active: number; recruiting: number; completed: number; totalSubjects: number };
  data: { crfPages: number; queries: number; resolvedQueries: number };
  safety: { totalAE: number; sae: number; monitoringVisits: number };
  rws: { studies: number; datasets: number; publications: number };
  ethics: { pendingReviews: number; approved: number };
  suggestions: string[];
}

/**
 * 构建临床研究报告。
 *
 * @param timeRange 时间范围
 * @returns 临床研究报告
 */
export function buildClinicalResearchReport(timeRange: string): ClinicalResearchReport {
  return {
    timeRange,
    trials: { active: 20, recruiting: 8, completed: 15, totalSubjects: 1200 },
    data: { crfPages: 50000, queries: 300, resolvedQueries: 280 },
    safety: { totalAE: 150, sae: 5, monitoringVisits: 40 },
    rws: { studies: 10, datasets: 50, publications: 25 },
    ethics: { pendingReviews: 3, approved: 50 },
    suggestions: ['加快入组进度', '提高数据质量'],
  };
}
