/**
 * 健澜科技 jlmedaios - 低代码智能体搭建 API（M4-B）
 * 相对路径（业务 API 禁 /api/v1 全路径，避免双前缀）。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { del, get, post } from '../request';
import type {
  AgentBuilderDetail,
  AgentBuilderSummary,
  BumpKind,
  PublishResult,
  SaveDraftResult,
  ValidateResult,
} from '@/types/agentBuilder';
import type { AgentPackageJson } from '@/pages/builder/graph';

/** 智能体列表。 */
export function listBuilderAgentsApi(): Promise<AgentBuilderSummary[]> {
  return get('/agent-builder/agents');
}

/** 智能体详情。 */
export function getBuilderAgentApi(agentId: string): Promise<AgentBuilderDetail> {
  return get(`/agent-builder/agents/${agentId}`);
}

/** 保存画布草稿（payload 为 builderToPackage 输出的智能体包）。 */
export function saveDraftApi(pkg: AgentPackageJson): Promise<SaveDraftResult> {
  return post('/agent-builder/draft', pkg);
}

/** 校验草稿。 */
export function validateDraftApi(agentId: string): Promise<ValidateResult> {
  return post(`/agent-builder/agents/${agentId}/validate`, {});
}

/** 发布草稿。 */
export function publishDraftApi(
  agentId: string,
  options: { bump?: BumpKind; changelog?: string } = {},
): Promise<PublishResult> {
  return post(`/agent-builder/agents/${agentId}/publish`, options);
}

/** 删除智能体。 */
export function deleteBuilderAgentApi(agentId: string): Promise<{ deleted: string }> {
  return del(`/agent-builder/agents/${agentId}`);
}
