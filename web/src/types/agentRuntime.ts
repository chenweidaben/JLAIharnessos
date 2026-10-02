/**
 * 健澜科技 jlmedaios - 智能体运行时类型（M4-C）
 * 与后端 agentRuntimeAggregator / agentRuntimeRepo 视图模型对齐。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 运行实例视图 */
export interface WorkflowInstanceView {
  id: string;
  instanceNo: string;
  agentId: string;
  agentVersion: string | null;
  workflowId: string;
  state: string;
  triggerType: string | null;
  traceId: string | null;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  contextVars: Record<string, unknown>;
  errorCode: string | null;
  errorMessage: string | null;
  actorId: string | null;
  patientRef: string | null;
  tokensIn: number;
  tokensOut: number;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
}

/** 节点执行记录视图 */
export interface NodeRecordView {
  id: string;
  instanceId: string;
  nodeId: string;
  nodeType: string;
  state: string;
  attempts: number;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
}

/** 运行详情（实例 + 节点记录） */
export interface RunDetailView {
  instance: WorkflowInstanceView;
  nodes: NodeRecordView[];
}

/** 触发执行请求体 */
export interface StartRunRequest {
  version?: string;
  input?: Record<string, unknown>;
  timeoutMs?: number;
  patientRef?: string;
}
