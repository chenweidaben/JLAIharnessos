/**
 * 健澜科技 jlmedaios - MUSE 跨角色任务流转 V5 纯函数（M284-B）
 *
 * createHandoffV5 / routeHandoffV5 / closeHandoffV5 / buildMuseHandoffV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 交接事项 */
export interface Handoff {
  id: string;
  fromRole: string;
  toRole: string;
  topic: string;
  context: string;
  actionRequired: string;
  status: "pending" | "accepted" | "closed";
}

/**
 * 创建交接 V5（纯函数）：默认 pending。
 *
 * @param from 发起角色
 * @param to 接收角色
 * @param topic 主题
 * @param context 上下文
 * @param actionRequired 要求动作
 * @returns 交接事项
 */
export function createHandoffV5(
  from: string,
  to: string,
  topic: string,
  context: string,
  actionRequired: string,
): Handoff {
  return {
    id: `handoff-${Date.now()}`,
    fromRole: from,
    toRole: to,
    topic,
    context,
    actionRequired,
    status: "pending",
  };
}

/**
 * 路由交接 V5（纯函数）：按 topic 关键词推荐下一个角色。
 *
 * @param handoff 交接事项
 * @returns 建议接收角色
 */
export function routeHandoffV5(handoff: Handoff): { recommendedRole: string; reason: string } {
  if (handoff.topic.includes("用药") || handoff.topic.includes("审方")) {
    return { recommendedRole: "药师", reason: "用药相关自动路由药师" };
  }
  if (handoff.topic.includes("随访") || handoff.topic.includes("巡视")) {
    return { recommendedRole: "护士", reason: "随访巡视类自动路由护士" };
  }
  if (handoff.topic.includes("质控") || handoff.topic.includes("KPI")) {
    return { recommendedRole: "管理者", reason: "质控KPI类自动路由管理者" };
  }
  return { recommendedRole: handoff.toRole, reason: "按原指定角色" };
}

/**
 * 闭环交接 V5（纯函数）：标记 closed。
 *
 * @param handoff 交接事项
 * @param result 闭环结果
 * @returns 闭环后交接
 */
export function closeHandoffV5(handoff: Handoff, result: string): Handoff {
  return { ...handoff, status: "closed", context: `${handoff.context}\n闭环结果：${result}` };
}

/** 交接看板输出 */
export interface MuseHandoffV5Report {
  totalHandoffs: number;
  pendingCount: number;
  closedCount: number;
}

/**
 * 构建交接看板（纯函数）。
 *
 * @param handoffs 交接列表
 * @returns 看板
 */
export function buildMuseHandoffV5Report(handoffs: Handoff[]): MuseHandoffV5Report {
  return {
    totalHandoffs: handoffs.length,
    pendingCount: handoffs.filter((h) => h.status === "pending").length,
    closedCount: handoffs.filter((h) => h.status === "closed").length,
  };
}
