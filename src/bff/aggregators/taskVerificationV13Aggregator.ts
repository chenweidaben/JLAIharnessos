/**
 * 健澜科技 jlmedaios - 任务验收与效果验证 V13 纯函数（M307-C）
 *
 * verifyTaskOutcomeV13 / rejectIfNoImprovementV13 / buildTaskVerificationReportV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 已验收任务 */
export interface VerifiedTaskV13 {
  taskId: string;
  title: string;
  expectedGain: number;
  beforeScore: number;
  afterScore: number;
  status: "accepted" | "rejected";
}

/** 验收报告 */
export interface TaskVerificationReportV13 {
  acceptedCount: number;
  rejectedCount: number;
  avgGain: number;
}

/**
 * 任务验收（纯函数）：after >= before + expectedGain×0.5 → accepted。
 *
 * @param task 任务（带 expectedGain）
 * @param beforeScore 前分
 * @param afterScore 后分
 * @returns 是否通过
 */
export function verifyTaskOutcomeV13(
  task: { expectedGain: number },
  beforeScore: number,
  afterScore: number,
): boolean {
  const threshold = beforeScore + task.expectedGain * 0.5;
  return afterScore >= threshold;
}

/**
 * 验收驳回（纯函数）：无改善 → status="rejected"。
 *
 * @param verified 已验收任务
 * @returns 带驳回状态
 */
export function rejectIfNoImprovementV13(verified: VerifiedTaskV13): VerifiedTaskV13 {
  if (verified.afterScore < verified.beforeScore) {
    return { ...verified, status: "rejected" };
  }
  return verified;
}

/**
 * 验收报告（纯函数）：accepted/rejected 计数 + avgGain。
 *
 * @param tasks 已验收任务
 * @returns 报告
 */
export function buildTaskVerificationReportV13(tasks: VerifiedTaskV13[]): TaskVerificationReportV13 {
  const accepted = tasks.filter((t) => t.status === "accepted");
  const rejected = tasks.filter((t) => t.status === "rejected");
  const avgGain = tasks.length === 0
    ? 0
    : Math.round((accepted.reduce((s, t) => s + (t.afterScore - t.beforeScore), 0) / tasks.length) * 10) / 10;
  return {
    acceptedCount: accepted.length,
    rejectedCount: rejected.length,
    avgGain,
  };
}
