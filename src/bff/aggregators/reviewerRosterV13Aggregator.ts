/**
 * 健澜科技 jlmedaios - 评审专家资质与激励 V13 纯函数（M299-C）
 *
 * eligibleReviewerV13 / creditReviewWorkV13 / buildReviewerRosterV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 评审候选贡献者 */
export interface ReviewerContributorV13 {
  doctorId: string;
  name: string;
  score: number;
  reviewCount: number;
}

/** 评审专家名册条目 */
export interface ReviewerRosterEntryV13 {
  doctorId: string;
  name: string;
  score: number;
  reviewCount: number;
}

/**
 * 评审专家资格（纯函数）：贡献分 ≥ 50。
 *
 * @param contributor 贡献者
 * @returns 是否可评审
 */
export function eligibleReviewerV13(contributor: ReviewerContributorV13): boolean {
  return contributor.score >= 50;
}

/**
 * 评审工作量计分（纯函数）：baseScore + reviewCount×2，clamp 0-100。
 *
 * @param baseScore 基础贡献分
 * @param reviewCount 评审条数
 * @returns 新分数
 */
export function creditReviewWorkV13(baseScore: number, reviewCount: number): number {
  const raw = baseScore + reviewCount * 2;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/**
 * 评审专家名册（纯函数）：只含 eligible=true 的，按 score 降序。
 *
 * @param contributors 贡献者列表
 * @returns 名册
 */
export function buildReviewerRosterV13(
  contributors: ReviewerContributorV13[],
): ReviewerRosterEntryV13[] {
  return contributors
    .filter((c) => eligibleReviewerV13(c))
    .sort((a, b) => b.score - a.score)
    .map((c): ReviewerRosterEntryV13 => ({
      doctorId: c.doctorId,
      name: c.name,
      score: c.score,
      reviewCount: c.reviewCount,
    }));
}
