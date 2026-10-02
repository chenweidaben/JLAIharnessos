/**
 * 健澜科技 jlmedaios - 人工工单类型（M4-D）
 * 与后端 humanTaskRepo / agentRuntimeAggregator 视图模型对齐。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 人工工单视图 */
export interface HumanTaskView {
  id: string;
  taskNo: string;
  instanceId: string;
  nodeId: string;
  title: string;
  instructions: string | null;
  assigneeRoles: string[];
  assigneeUsers: string[];
  formSchema: Record<string, unknown>;
  reviewData: unknown;
  status: string;
  resolution: {
    approved?: boolean;
    formData?: Record<string, unknown>;
    reviewerId?: string;
    comment?: string;
  } | null;
  claimedBy: string | null;
  resolvedBy: string | null;
  dueAt: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

/** 工单详情（含关联实例） */
export interface HumanTaskDetailView {
  task: HumanTaskView;
  instance: import('./agentRuntime').WorkflowInstanceView | null;
}

/** 处理工单请求体 */
export interface ResolveTaskRequest {
  approved: boolean;
  comment?: string;
  formData?: Record<string, unknown>;
}
