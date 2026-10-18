/**
 * 健澜科技 jlmedaios - 模板版本审核工作流 V14 聚合器（M461-C）
 *
 * 纯函数：审核状态机判断 + 审核意见文本构造。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 审核状态 */
export type ReviewStatusV14 = "pending_review" | "approved" | "rejected";

/** 审核记录 */
export interface ReviewRecordV14 {
  id: string;
  templateName: string;
  version: string;
  status: ReviewStatusV14;
  submitter: string;
  submittedAt: string;
  reviewer?: string;
  reviewedAt?: string;
  comment?: string;
}

/** 可批准判断结果 */
export interface CanApproveResultV14 {
  approve: boolean;
  reason?: string;
}

/**
 * 判断是否可批准。
 *
 * @param review 审核记录
 * @returns approve + 不可操作时的 reason
 */
export function canApprove(review: ReviewRecordV14): CanApproveResultV14 {
  if (review.status === "approved") {
    return { approve: false, reason: "该模板已批准，不可重复操作" };
  }
  if (review.status === "rejected") {
    return { approve: false, reason: "该模板已驳回，不可重复操作" };
  }
  return { approve: true };
}

/**
 * 构造审核意见文本。
 *
 * @param action 操作类型：approve / reject
 * @param reviewer 审核人
 * @param comment 附加意见
 * @returns 审核意见文本
 */
export function buildReviewComment(action: "approve" | "reject", reviewer: string, comment?: string): string {
  const actionLabel = action === "approve" ? "批准" : "驳回";
  const base = `${actionLabel} by ${reviewer}`;
  if (comment) return `${base}：${comment}`;
  return base;
}
