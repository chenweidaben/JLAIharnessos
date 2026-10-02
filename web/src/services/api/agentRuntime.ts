/**
 * 健澜科技 jlmedaios - 智能体运行时 API（M4-C）
 * 相对路径（业务 API 禁 /api/v1 全路径，避免双前缀）。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type {
  RunDetailView,
  StartRunRequest,
  WorkflowInstanceView,
} from '@/types/agentRuntime';

/** 触发执行已发布智能体。 */
export function startAgentRunApi(
  agentId: string,
  body: StartRunRequest = {},
): Promise<RunDetailView> {
  return post(`/agent-runtime/agents/${agentId}/run`, body);
}

/** 列出运行实例（可按 agentId / state 过滤）。 */
export function listAgentRunsApi(filter: {
  agentId?: string;
  state?: string;
  limit?: number;
} = {}): Promise<WorkflowInstanceView[]> {
  const params = new URLSearchParams();
  if (filter.agentId) params.set('agentId', filter.agentId);
  if (filter.state) params.set('state', filter.state);
  if (filter.limit) params.set('limit', String(filter.limit));
  const qs = params.toString();
  return get(`/agent-runtime/instances${qs ? `?${qs}` : ''}`);
}

/** 获取运行实例详情（含节点记录）。 */
export function getAgentRunApi(instanceId: string): Promise<RunDetailView> {
  return get(`/agent-runtime/instances/${instanceId}`);
}

/** 取消运行中实例。 */
export function cancelAgentRunApi(
  instanceId: string,
  reason?: string,
): Promise<RunDetailView> {
  return post(`/agent-runtime/instances/${instanceId}/cancel`, { reason });
}
