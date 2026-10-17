/**
 * 健澜科技 jlmedaios - 质量门禁总览 V13 纯函数（M299-D）
 *
 * buildQualityGateDashboardV13 / computeQualityPassRateV13 / identifyQualityRiskV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 门禁总览 */
export interface QualityGateDashboardV13 {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  rolledbackCount: number;
  reviewerCount: number;
}

/**
 * 门禁总览（纯函数）：直接取各数组长度。
 *
 * @param pendingReviews 待审列表
 * @param approved 通过列表
 * @param rejected 驳回列表
 * @param rolledbacks 回滚列表
 * @param reviewers 评审专家列表
 * @returns 总览
 */
export function buildQualityGateDashboardV13(
  pendingReviews: unknown[],
  approved: unknown[],
  rejected: unknown[],
  rolledbacks: unknown[],
  reviewers: unknown[],
): QualityGateDashboardV13 {
  return {
    pendingCount: pendingReviews.length,
    approvedCount: approved.length,
    rejectedCount: rejected.length,
    rolledbackCount: rolledbacks.length,
    reviewerCount: reviewers.length,
  };
}

/**
 * 通过率（纯函数）：approved/(approved+rejected)×100，保留1位。
 *
 * @param approved 通过数
 * @param rejected 驳回数
 * @returns 通过率%
 */
export function computeQualityPassRateV13(approved: number, rejected: number): number {
  const total = approved + rejected;
  if (total === 0) return 0;
  return Math.round((approved / total) * 1000) / 10;
}

/**
 * 质量风险识别（纯函数）：rejected>approved → "经验质量堪忧"；pending>10 → "评审积压"。
 *
 * @param dashboard 总览
 * @returns 风险描述（无则空串）
 */
export function identifyQualityRiskV13(dashboard: QualityGateDashboardV13): string {
  if (dashboard.rejectedCount > dashboard.approvedCount) {
    return "经验质量堪忧：驳回数超过通过数";
  }
  if (dashboard.pendingCount > 10) {
    return "评审积压：待审队列超过10条";
  }
  return "";
}
