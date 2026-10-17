/**
 * 健澜科技 jlmedaios - 经验质量同行评审 V13 纯函数（M299-A）
 *
 * submitExperienceForReviewV13 / reviewExperienceV13 / isApprovedV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 评审条目 */
export interface ReviewV13 {
  reviewerId: string;
  score: number;
  comment: string;
}

/** 待审经验 */
export interface ReviewableExpV13 {
  experienceId: string;
  title: string;
  dept: string;
  author: string;
  status: "pending" | "approved" | "rejected";
  reviews: ReviewV13[];
}

/**
 * 进待审队列（纯函数）：设置 status="pending"。
 *
 * @param experience 经验
 * @param queue 当前队列
 * @returns 新队列（含该经验）
 */
export function submitExperienceForReviewV13(
  experience: Omit<ReviewableExpV13, "status" | "reviews">,
  queue: ReviewableExpV13[],
): ReviewableExpV13[] {
  const entry: ReviewableExpV13 = {
    ...experience,
    status: "pending",
    reviews: [],
  };
  return [...queue, entry];
}

/**
 * 评审打分累计（纯函数）：追加一条 review。
 *
 * @param experience 经验
 * @param reviewerId 评审人
 * @param score 1-5
 * @param comment 评语
 * @returns 新经验（reviews 已追加）
 */
export function reviewExperienceV13(
  experience: ReviewableExpV13,
  reviewerId: string,
  score: number,
  comment: string,
): ReviewableExpV13 {
  const clamped = Math.max(1, Math.min(5, Math.round(score)));
  return {
    ...experience,
    reviews: [...experience.reviews, { reviewerId, score: clamped, comment }],
  };
}

/**
 * 评审通过判定（纯函数）：平均 score≥3.5 且评审人数≥2 → approved；否则 pending（不足2人）/ rejected（均分<3.5）。
 *
 * @param experience 经验
 * @returns "approved" | "pending" | "rejected"
 */
export function isApprovedV13(experience: ReviewableExpV13): "approved" | "pending" | "rejected" {
  if (experience.reviews.length < 2) return "pending";
  const avg = experience.reviews.reduce((s, r) => s + r.score, 0) / experience.reviews.length;
  if (avg >= 3.5) return "approved";
  return "rejected";
}
