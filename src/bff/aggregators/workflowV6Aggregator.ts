/**
 * 健澜科技 jlmedaios - 智能审批与工作流引擎 V6 纯函数（M288-A）
 *
 * buildWfGraphV6 / nextNodeV6 / startWfV6
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 流程节点 */
export interface WfNode {
  id: string;
  name: string;
  role: string;
  nextOnApprove: string | null;
}

/** 流程定义 */
export interface WfDefinition {
  id: string;
  name: string;
  category: string;
  nodes: WfNode[];
  version: string;
  status: "active" | "draft";
}

/** 流程实例 */
export interface WfInstance {
  id: string;
  defId: string;
  title: string;
  applicant: string;
  currentNodeId: string;
  status: "running" | "approved" | "rejected";
}

/**
 * 构建节点图 V6（纯函数）：返回节点数与起止节点。
 *
 * @param nodes 节点列表
 * @returns 图结构概要
 */
export function buildWfGraphV6(nodes: WfNode[]): { nodeCount: number; startNodeId: string | null; endNodeId: string | null } {
  if (nodes.length === 0) return { nodeCount: 0, startNodeId: null, endNodeId: null };
  const referenced = new Set<string>();
  for (const n of nodes) {
    if (n.nextOnApprove) referenced.add(n.nextOnApprove);
  }
  const start = nodes.find((n) => !referenced.has(n.id));
  const end = nodes.find((n) => n.nextOnApprove === null);
  return {
    nodeCount: nodes.length,
    startNodeId: start?.id ?? nodes[0].id,
    endNodeId: end?.id ?? null,
  };
}

/**
 * 下一节点判定 V6（纯函数）：approve→下一节点，reject→终止。
 *
 * @param def 流程定义
 * @param currentNodeId 当前节点
 * @param result 审批结果
 * @returns 下一节点或终止状态
 */
export function nextNodeV6(
  def: WfDefinition,
  currentNodeId: string,
  result: "approve" | "reject",
): { nextNodeId: string | null; status: "running" | "approved" | "rejected" } {
  if (result === "reject") {
    return { nextNodeId: null, status: "rejected" };
  }
  const current = def.nodes.find((n) => n.id === currentNodeId);
  if (!current) return { nextNodeId: null, status: "rejected" };
  if (!current.nextOnApprove) {
    return { nextNodeId: null, status: "approved" };
  }
  return { nextNodeId: current.nextOnApprove, status: "running" };
}

/**
 * 发起流程 V6（纯函数）：返回新实例。
 *
 * @param def 流程定义
 * @param applicant 申请人
 * @param title 标题
 * @returns 新实例
 */
export function startWfV6(def: WfDefinition, applicant: string, title: string): WfInstance {
  const graph = buildWfGraphV6(def.nodes);
  return {
    id: `wf-${Date.now()}`,
    defId: def.id,
    title,
    applicant,
    currentNodeId: graph.startNodeId ?? def.nodes[0]?.id ?? "start",
    status: "running",
  };
}
