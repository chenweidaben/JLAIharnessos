/**
 * 健澜科技 jlmedaios - 知识资产生命周期总览 V13 纯函数（M296-D）
 *
 * buildKnowledgeLifecycleV13 / computeLifecycleHealthV13 / identifyLifecycleGapV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 生命周期输入（最小字段） */
export interface LifecycleInputV13 {
  experienceId: string;
  bucket: "fresh" | "aging" | "stale" | "archive";
}

/** 生命周期总览 */
export interface LifecycleOverviewV13 {
  freshCount: number;
  staleCount: number;
  archivedCount: number;
  pendingReviewCount: number;
  total: number;
}

/**
 * 生命周期总览（纯函数）：按 bucket 计数 + 待复核数。
 *
 * @param experiences 经验列表
 * @param pendingReviewCount 待复核任务数
 * @returns 总览
 */
export function buildKnowledgeLifecycleV13(
  experiences: LifecycleInputV13[],
  pendingReviewCount: number,
): LifecycleOverviewV13 {
  const fresh = experiences.filter((e) => e.bucket === "fresh").length;
  const stale = experiences.filter((e) => e.bucket === "stale").length;
  const archived = experiences.filter((e) => e.bucket === "archive").length;
  return {
    freshCount: fresh,
    staleCount: stale,
    archivedCount: archived,
    pendingReviewCount,
    total: experiences.length,
  };
}

/**
 * 健康分（纯函数）：fresh 占比 × 100，0-100，保留1位小数。
 *
 * @param overview 总览
 * @returns 健康分
 */
export function computeLifecycleHealthV13(overview: LifecycleOverviewV13): number {
  if (overview.total === 0) return 0;
  return Math.round((overview.freshCount / overview.total) * 1000) / 10;
}

/**
 * 缺口识别（纯函数）：stale>fresh → 经验老化严重；pendingReview>5 → 复核积压。
 *
 * @param overview 总览
 * @returns 缺口列表
 */
export function identifyLifecycleGapV13(overview: LifecycleOverviewV13): string[] {
  const gaps: string[] = [];
  if (overview.staleCount > overview.freshCount) gaps.push("经验老化严重");
  if (overview.pendingReviewCount > 5) gaps.push("复核积压");
  return gaps;
}
