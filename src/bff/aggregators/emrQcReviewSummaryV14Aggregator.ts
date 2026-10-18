/**
 * 健澜科技 jlmedaios - 质控评审意见汇总 V14 聚合器（M502-C）
 *
 * 纯函数：评审意见汇总 + 汇总报告构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 评审项 */
export interface ReviewItemV14 {
  expert: string;
  score: number;
  comment: string;
}

/** 评审汇总 */
export interface ReviewSummaryV14 {
  total: number;
  avgScore: number;
  positive: number;
}

/** 汇总报告 */
export interface ReviewSummaryReportV14 {
  total: number;
  avgScore: number;
  positive: number;
  positiveRate: number;
}

/**
 * 汇总评审意见（总评审数 + 平均分 + 好评数）。
 *
 * @param reviews 评审数组
 * @returns 评审汇总
 */
export function aggregateReviews(reviews: ReviewItemV14[]): ReviewSummaryV14 {
  // 手算 avgScore：所有评分之和 / 评审数，保留 1 位小数
  if (reviews.length === 0) {
    return { total: 0, avgScore: 0, positive: 0 };
  }
  const sum = reviews.reduce((acc, r) => acc + r.score, 0);
  const avgScore = Math.round((sum / reviews.length) * 10) / 10;
  // 手算 positive：score >= 80 算好评
  const positive = reviews.filter((r) => r.score >= 80).length;
  return { total: reviews.length, avgScore, positive };
}

/**
 * 构建汇总报告（总评审数 + 平均分 + 好评数 + 好评率）。
 *
 * @param summary 评审汇总
 * @returns 汇总报告
 */
export function buildReviewSummary(summary: ReviewSummaryV14): ReviewSummaryReportV14 {
  // 手算 positiveRate：好评数 / 总评审数 * 100，保留 1 位小数；总评审数为 0 时好评率为 0
  const positiveRate =
    summary.total > 0
      ? Math.round((summary.positive / summary.total) * 1000) / 10
      : 0;
  return {
    total: summary.total,
    avgScore: summary.avgScore,
    positive: summary.positive,
    positiveRate,
  };
}
