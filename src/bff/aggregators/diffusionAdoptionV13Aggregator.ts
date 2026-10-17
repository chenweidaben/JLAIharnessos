/**
 * 健澜科技 jlmedaios - 跨科室采纳反馈 V13 纯函数（M304-B）
 *
 * trackDiffusionAdoptionV13 / computeDiffusionAdoptionRateV13 / flagDiffusionFailureV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 跨科室采纳动作 */
export interface DiffusionActionV13 {
  experienceId: string;
  deptId: string;
  action: "adopted" | "modified" | "rejected";
}

/** 追踪结果 */
export interface TrackedAdoptionV13 {
  experienceId: string;
  deptId: string;
  action: DiffusionActionV13["action"];
  tracked: boolean;
}

/**
 * 追踪跨科室采纳（纯函数）：直接透传并标 tracked=true。
 *
 * @param action 动作
 * @returns 追踪结果
 */
export function trackDiffusionAdoptionV13(action: DiffusionActionV13): TrackedAdoptionV13 {
  return {
    experienceId: action.experienceId,
    deptId: action.deptId,
    action: action.action,
    tracked: true,
  };
}

/**
 * 扩散采纳率（纯函数）：adopted/total×100，保留1位。
 *
 * @param actions 动作列表
 * @returns 采纳率（%）
 */
export function computeDiffusionAdoptionRateV13(actions: DiffusionActionV13[]): number {
  const total = actions.length;
  if (total === 0) return 0;
  const adopted = actions.filter((a) => a.action === "adopted").length;
  return Math.round((adopted / total) * 1000) / 10;
}

/**
 * 扩散失败标记（纯函数）：采纳率<30 → "该经验外科室不适用，建议停止扩散"。
 *
 * @param rate 采纳率
 * @returns 失败描述（无则空串）
 */
export function flagDiffusionFailureV13(rate: number): string {
  if (rate < 30 && rate > 0) return "该经验外科室不适用，建议停止扩散";
  return "";
}
