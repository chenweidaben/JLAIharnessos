/**
 * 健澜科技 jlmedaios - 质控专家绩效统计 V14 聚合器（M502-D，M502 收官）
 *
 * 纯函数：专家绩效构建 + 专家绩效聚合。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 专家绩效 */
export interface ExpertPerformanceV14 {
  expert: string;
  reviewedCount: number;
  avgScore: number;
}

/** 聚合结果 */
export interface ExpertPerformanceAggregateV14 {
  totalReviews: number;
  avgScore: number;
}

/**
 * 构建专家绩效。
 *
 * @param expert 专家姓名
 * @param reviewedCount 评审数
 * @param avgScore 平均评分
 * @returns 专家绩效
 */
export function buildExpertPerformance(expert: string, reviewedCount: number, avgScore: number): ExpertPerformanceV14 {
  return { expert, reviewedCount, avgScore };
}

/**
 * 聚合专家绩效（总评审数 + 全院平均分）。
 *
 * @param perf 专家绩效数组
 * @returns 聚合结果
 */
export function aggregateExpertPerformance(perf: ExpertPerformanceV14[]): ExpertPerformanceAggregateV14 {
  // 手算 totalReviews：所有专家 reviewedCount 之和
  if (perf.length === 0) {
    return { totalReviews: 0, avgScore: 0 };
  }
  const totalReviews = perf.reduce((acc, p) => acc + p.reviewedCount, 0);
  // 手算 avgScore：所有专家 avgScore 之和 / 专家数，保留 1 位小数
  const sum = perf.reduce((acc, p) => acc + p.avgScore, 0);
  const avgScore = Math.round((sum / perf.length) * 10) / 10;
  return { totalReviews, avgScore };
}
