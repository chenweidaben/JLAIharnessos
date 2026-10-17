/**
 * 健澜科技 jlmedaios - 闭环回灌飞轮 V13 纯函数（M307-D）
 *
 * recomputeFlywheelAfterActionV13 / computeClosureRateV13 / identifyLoopLeakV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 闭环任务 */
export interface ClosedLoopTaskV13 {
  taskId: string;
  title: string;
  status: "open" | "in_progress" | "done" | "rejected";
  beforeScore: number;
  afterScore: number;
}

/**
 * 回灌飞轮（纯函数）：accepted 任务 avgGain×0.6 加回飞轮分，反例不加分，clamp 0-100，保留1位。
 *
 * @param prevScore 原飞轮分
 * @param acceptedTasks 已验收任务（status=done 视为 accepted）
 * @returns 回灌后新分
 */
export function recomputeFlywheelAfterActionV13(
  prevScore: number,
  acceptedTasks: ClosedLoopTaskV13[],
): number {
  const accepted = acceptedTasks.filter((t) => t.status === "done");
  if (accepted.length === 0) return Math.round(prevScore * 10) / 10;
  const avgGain = accepted.reduce((s, t) => s + (t.afterScore - t.beforeScore), 0) / accepted.length;
  const next = prevScore + avgGain * 0.6;
  const clamped = Math.max(0, Math.min(next, 100));
  return Math.round(clamped * 10) / 10;
}

/**
 * 闭环率（纯函数）：done/total×100，整数百分比。
 *
 * @param tasks 任务列表
 * @returns 闭环率
 */
export function computeClosureRateV13(tasks: ClosedLoopTaskV13[]): number {
  if (tasks.length === 0) return 0;
  const done = tasks.filter((t) => t.status === "done").length;
  return Math.round((done / tasks.length) * 100);
}

/**
 * 泄漏识别（纯函数）：closureRate<60 → "任务做完不回灌飞轮"；hasOverdueUplifted=true → "存在任务滞留"。
 *
 * @param closureRate 闭环率
 * @param hasOverdueUplifted 是否有逾期滞留任务
 * @returns 泄漏描述
 */
export function identifyLoopLeakV13(closureRate: number, hasOverdueUplifted: boolean): string {
  if (closureRate < 60) return "任务做完不回灌飞轮";
  if (hasOverdueUplifted) return "存在任务滞留";
  return "闭环健康";
}
