/**
 * 健澜科技 jlmedaios - 过期经验复核工作流 V13 纯函数（M296-B）
 *
 * buildReviewTaskV13 / resolveReviewTaskV13 / buildReviewQueueV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 过期经验 */
export interface StaleExperienceV13 {
  experienceId: string;
  title: string;
  monthsAgo: number;
  author: string;
}

/** 复核任务 */
export interface ReviewTaskV13 {
  taskId: string;
  experienceId: string;
  title: string;
  monthsAgo: number;
  author: string;
  status: "pending" | "confirmed" | "archived";
}

/**
 * 生成复核任务（纯函数）：stale → pending 任务。
 *
 * @param experiences 过期经验
 * @returns 任务列表
 */
export function buildReviewTaskV13(experiences: StaleExperienceV13[]): ReviewTaskV13[] {
  return experiences.map((e): ReviewTaskV13 => ({
    taskId: `rt-${e.experienceId}`,
    experienceId: e.experienceId,
    title: e.title,
    monthsAgo: e.monthsAgo,
    author: e.author,
    status: "pending",
  }));
}

/**
 * 复核结果（纯函数）：confirm → fresh 状态；outdated → archived。
 *
 * @param task 任务
 * @param decision confirm | outdated
 * @returns 更新后任务
 */
export function resolveReviewTaskV13(
  task: ReviewTaskV13,
  decision: "confirm" | "outdated",
): ReviewTaskV13 {
  return {
    ...task,
    status: decision === "confirm" ? "confirmed" : "archived",
  };
}

/**
 * 复核队列统计（纯函数）：pendingCount / overdueCount（monthsAgo>30 视为 overdue）。
 *
 * @param tasks 任务列表
 * @returns 统计
 */
export function buildReviewQueueV13(tasks: ReviewTaskV13[]): {
  pendingCount: number;
  overdueCount: number;
} {
  const pending = tasks.filter((t) => t.status === "pending");
  return {
    pendingCount: pending.length,
    overdueCount: pending.filter((t) => t.monthsAgo > 30).length,
  };
}
