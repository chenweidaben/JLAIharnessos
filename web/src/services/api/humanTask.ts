/**
 * 健澜科技 jlmedaios - 人工工单 API（M4-D）
 * 相对路径（业务 API 禁 /api/v1 全路径，避免双前缀）。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type {
  HumanTaskDetailView,
  HumanTaskView,
  ResolveTaskRequest,
} from '@/types/humanTask';

/** 列出当前审核人可处理的工单（默认仅未完成）。 */
export function listMyHumanTasksApi(filter: {
  status?: string;
  limit?: number;
} = {}): Promise<HumanTaskView[]> {
  const params = new URLSearchParams();
  params.set('status', filter.status ?? 'pending');
  if (filter.limit) params.set('limit', String(filter.limit));
  return get(`/human-tasks?${params.toString()}`);
}

/** 获取工单详情（含关联实例）。 */
export function getHumanTaskApi(taskId: string): Promise<HumanTaskDetailView> {
  return get(`/human-tasks/${taskId}`);
}

/** 认领工单。 */
export function claimHumanTaskApi(taskId: string): Promise<HumanTaskDetailView> {
  return post(`/human-tasks/${taskId}/claim`, {});
}

/** 处理工单（批准/驳回）。 */
export function resolveHumanTaskApi(
  taskId: string,
  body: ResolveTaskRequest,
): Promise<HumanTaskDetailView> {
  return post(`/human-tasks/${taskId}/resolve`, body);
}
