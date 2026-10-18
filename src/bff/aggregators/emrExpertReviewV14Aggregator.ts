/**
 * 健澜科技 jlmedaios - 病历质控专家在线评审 V14 聚合器（M471-B）
 *
 * 纯函数：分配评审专家 + 提交评审结果 + 按病例聚合平均分。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 专家分配结果 */
export interface ExpertAssignmentV14 {
  caseId: string;
  expert: string;
  status: "assigned";
}

/** 评审结果 */
export interface ReviewResultV14 {
  caseId: string;
  score: number;
  comment: string;
  status: "submitted";
}

/** 评审聚合 */
export interface ReviewAggregateV14 {
  caseId: string;
  avgScore: number;
}

/** 评审条目输入 */
export interface ReviewItemV14 {
  caseId: string;
  score: number;
}

/**
 * 分配评审专家，返回 status='assigned'。
 *
 * @param caseId 病例 ID
 * @param expert 专家姓名
 * @returns 分配结果
 */
export function assignExpert(caseId: string, expert: string): ExpertAssignmentV14 {
  return { caseId, expert, status: "assigned" };
}

/**
 * 提交评审结果，返回 status='submitted'。
 *
 * @param caseId 病例 ID
 * @param score 评分
 * @param comment 评语
 * @returns 评审结果
 */
export function buildReviewResult(caseId: string, score: number, comment: string): ReviewResultV14 {
  return { caseId, score, comment, status: "submitted" };
}

/**
 * 按 caseId 聚合平均分（保留 1 位小数）。
 *
 * @param reviews 评审条目列表
 * @returns 聚合结果
 */
export function aggregateReviewScore(reviews: ReviewItemV14[]): ReviewAggregateV14[] {
  if (reviews.length === 0) return [];
  const map = new Map<string, { sum: number; count: number }>();
  for (const r of reviews) {
    const entry = map.get(r.caseId) ?? { sum: 0, count: 0 };
    entry.sum += r.score;
    entry.count += 1;
    map.set(r.caseId, entry);
  }
  return Array.from(map.entries()).map(([caseId, v]) => ({
    caseId,
    avgScore: Math.round((v.sum / v.count) * 10) / 10,
  }));
}
