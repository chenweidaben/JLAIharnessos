/**
 * 健澜科技 jlmedaios - 病历质量评分汇总 V14 聚合器（M481-D，M481 收官，-summary 避让 M465-B emrQualityScoreV14）
 *
 * 纯函数：质量评分记录构建 + 按科室聚合平均分。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质量评分记录 */
export interface QualityScoreSummaryV14 {
  dept: string;
  score: number;
}

/** 聚合后的科室平均分 */
export interface DeptAvgScoreV14 {
  dept: string;
  avgScore: number;
}

/**
 * 构建质量评分记录。
 *
 * @param dept 科室
 * @param score 分数
 * @returns 质量评分记录
 */
export function buildQualityScore(dept: string, score: number): QualityScoreSummaryV14 {
  return { dept, score };
}

/**
 * 按科室聚合平均分：avg=sum/count 保留 1 位小数。
 *
 * @param scores 评分列表
 * @returns 各科室平均分列表
 */
export function aggregateQualityScore(scores: QualityScoreSummaryV14[]): DeptAvgScoreV14[] {
  const groups = new Map<string, { sum: number; count: number }>();
  for (const item of scores) {
    const existing = groups.get(item.dept) ?? { sum: 0, count: 0 };
    groups.set(item.dept, { sum: existing.sum + item.score, count: existing.count + 1 });
  }
  const result: DeptAvgScoreV14[] = [];
  for (const [dept, group] of groups) {
    const avgScore = Math.round((group.sum / group.count) * 10) / 10;
    result.push({ dept, avgScore });
  }
  return result;
}
