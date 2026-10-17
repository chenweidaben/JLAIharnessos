/**
 * 健澜科技 jlmedaios - 患者满意度闭环 V13 纯函数（M311-A）
 *
 * dispatchComplaintV13 / trackFollowUpV13 / computeSatisfactionClosureRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 差评 */
export interface ComplaintV13 {
  id: string;
  patientName: string;
  score: number;
  resolved: boolean;
}

/** 整改任务 */
export interface DispatchTaskV13 {
  complaintId: string;
  owner: string;
  status: "open" | "resolved";
}

/**
 * 差评自动派单（纯函数）：低分≤3 → 生成整改任务，owner=护士长，status=open。
 *
 * @param complaint 差评
 * @returns 派单任务；非低分返回 null
 */
export function dispatchComplaintV13(complaint: ComplaintV13): DispatchTaskV13 | null {
  if (complaint.score > 3) return null;
  return {
    complaintId: complaint.id,
    owner: "护士长",
    status: "open",
  };
}

/**
 * 整改后回访（纯函数）：result resolved/unsatisfied → 更新任务。
 *
 * @param task 任务
 * @param followUpResult 回访结果
 * @returns 新任务
 */
export function trackFollowUpV13(
  task: DispatchTaskV13,
  followUpResult: "resolved" | "unsatisfied",
): DispatchTaskV13 {
  return {
    ...task,
    status: followUpResult === "resolved" ? "resolved" : "open",
  };
}

/**
 * 闭环率（纯函数）：resolved/total×100，整数。
 *
 * @param complaints 差评列表
 * @returns 闭环率
 */
export function computeSatisfactionClosureRateV13(complaints: ComplaintV13[]): number {
  if (complaints.length === 0) return 0;
  const resolved = complaints.filter((c) => c.resolved).length;
  return Math.round((resolved / complaints.length) * 100);
}
