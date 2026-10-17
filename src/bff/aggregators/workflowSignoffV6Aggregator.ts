/**
 * 健澜科技 jlmedaios - 工作流节点流转与会签 V6 纯函数（M288-C）
 *
 * advanceNodeV6 / countSignoffV6 / escalateTimeoutV6
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 流程任务 */
export interface WfTaskV6 {
  id: string;
  instanceId: string;
  nodeCode: string;
  assignee: string;
  action: "approve" | "reject" | "pending";
  comment?: string;
  actedAt?: number;
  dueAt?: number;
}

/** 流程实例 */
export interface WfInstanceV6 {
  id: string;
  currentNodeId: string;
  status: "running" | "approved" | "rejected";
  requiredSignoff: number;
}

/**
 * 推进节点 V6（纯函数）：approve→若会签通过则前进，否则停留；reject→终止。
 *
 * @param instance 实例
 * @param tasks 该节点全部任务
 * @param action 当前动作
 * @param nextNodeId 下一节点（若有）
 * @returns 推进结果
 */
export function advanceNodeV6(
  instance: WfInstanceV6,
  tasks: WfTaskV6[],
  action: "approve" | "reject",
  nextNodeId: string | null,
): { newStatus: "running" | "approved" | "rejected"; moved: boolean } {
  if (action === "reject") {
    return { newStatus: "rejected", moved: true };
  }
  const signed = countSignoffV6(tasks, instance.currentNodeId);
  if (signed < instance.requiredSignoff) {
    return { newStatus: "running", moved: false };
  }
  if (!nextNodeId) {
    return { newStatus: "approved", moved: true };
  }
  return { newStatus: "running", moved: true };
}

/**
 * 会签通过数 V6（纯函数）：统计 action=approve 的任务数。
 *
 * @param tasks 任务列表
 * @param nodeCode 节点编码
 * @returns 通过数
 */
export function countSignoffV6(tasks: WfTaskV6[], nodeCode: string): number {
  return tasks.filter((t) => t.nodeCode === nodeCode && t.action === "approve").length;
}

/**
 * 超时升级 V6（纯函数）：now > due 即升级；超时分钟向上取整（只要超时即至少 1 分钟）。
 *
 * @param now 当前时间戳
 * @param taskDue 任务截止时间戳
 * @returns 是否升级与超时分钟数
 */
export function escalateTimeoutV6(now: number, taskDue: number): { escalate: boolean; overdueMinutes: number } {
  const overdueMs = now - taskDue;
  if (overdueMs <= 0) {
    return { escalate: false, overdueMinutes: 0 };
  }
  return { escalate: true, overdueMinutes: Math.ceil(overdueMs / 60000) };
}
