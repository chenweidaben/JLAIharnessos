/**
 * 健澜科技 jlmedaios - 质控专家在线评审 V14 聚合器（M502-B）
 *
 * 纯函数：专家评审提交 + 评审报告构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 专家评审 */
export interface ExpertReviewV14 {
  expert: string;
  recordId: string;
  score: number;
  comment: string;
}

/** 评审报告 */
export interface ReviewReportV14 {
  total: number;
  avgScore: number;
}

/**
 * 提交专家评审。
 *
 * @param expert 专家姓名
 * @param recordId 病历号
 * @param score 评分
 * @param comment 评语
 * @returns 专家评审
 */
export function submitReview(expert: string, recordId: string, score: number, comment: string): ExpertReviewV14 {
  return { expert, recordId, score, comment };
}

/**
 * 构建评审报告（总评审数 + 平均分）。
 *
 * @param reviews 评审数组
 * @returns 评审报告
 */
export function buildReviewReport(reviews: ExpertReviewV14[]): ReviewReportV14 {
  // 手算 avgScore：所有评分之和 / 评审数，保留 1 位小数
  if (reviews.length === 0) {
    return { total: 0, avgScore: 0 };
  }
  const sum = reviews.reduce((acc, r) => acc + r.score, 0);
  const avgScore = Math.round((sum / reviews.length) * 10) / 10;
  return { total: reviews.length, avgScore };
}
