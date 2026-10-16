/**
 * 健澜科技 jlmedaios - 电子病历评级纯函数（M210-C）
 *
 * buildEMRRatingReport / assessEMRLevel / buildEMRGapAnalysis
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 评级能力特征 */
export interface EMRFeatures {
  dataCollection: boolean;
  cdr: boolean;
  closedLoopCDSS: boolean;
  paperless: boolean;
  aiAdvanced: boolean;
}

/**
 * 评估 EMR 等级（纯函数）。
 *
 * @param f 能力特征
 * @returns 等级
 */
export function assessEMRLevel(f: EMRFeatures): { level: number; label: string } {
  if (f.aiAdvanced) return { level: 8, label: 'AI 高级应用' };
  if (f.paperless) return { level: 7, label: '无纸化' };
  if (f.closedLoopCDSS) return { level: 6, label: '闭环 CDSS' };
  if (f.cdr) return { level: 5, label: 'CDR' };
  if (f.dataCollection) return { level: 1, label: '数据收集' };
  return { level: 0, label: '未达标' };
}

/**
 * 构建 EMR 差距分析（纯函数）。
 *
 * @param current 当前等级
 * @param target 目标等级
 * @returns 差距与整改
 */
export function buildEMRGapAnalysis(current: number, target: number): { gap: number; actions: string[] } {
  const gap = target - current;
  const actions: string[] = [];
  if (gap > 0) actions.push(`从 ${current} 级提升至 ${target} 级`);
  if (gap >= 2) actions.push('建设 CDR');
  if (gap >= 3) actions.push('建设闭环 CDSS');
  return { gap, actions };
}

/** EMR 评级报告输出 */
export interface EMRRatingReport {
  timeRange: string;
  current: number;
  target: number;
  features: EMRFeatures;
  gapAnalysis: { gap: number; actions: string[] };
  suggestions: string[];
}

/**
 * 构建 EMR 评级报告。
 *
 * @param timeRange 时间范围
 * @returns EMR 评级报告
 */
export function buildEMRRatingReport(timeRange: string): EMRRatingReport {
  return {
    timeRange,
    current: 5,
    target: 6,
    features: { dataCollection: true, cdr: true, closedLoopCDSS: false, paperless: false, aiAdvanced: false },
    gapAnalysis: buildEMRGapAnalysis(5, 6),
    suggestions: ['建设闭环 CDSS', '推进无纸化'],
  };
}
