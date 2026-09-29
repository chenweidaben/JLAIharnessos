/**
 * 健澜科技 jlmedaios - DRG 分组 API 服务（M3-D）
 *
 * 真实 BFF（src/bff/routes/drg.ts），全部读写 PostgreSQL，无 mock。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { get, post } from '../request';
import type { DrgResult, DrgResultListItem, DrgRule } from '@/types/drg';

/** 本地分组规则目录。 */
export function fetchDrgRules(): Promise<{ rules: DrgRule[] }> {
  return get<{ rules: DrgRule[] }>('/drg/rules');
}

/** 分组结果队列（可按状态过滤）。 */
export function fetchDrgResults(status?: string): Promise<{ results: DrgResultListItem[] }> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return get<{ results: DrgResultListItem[] }>(`/drg/results${qs}`);
}

/** 对出院就诊运行本地 DRG 分组（幂等）。 */
export function runDrgGroup(visitId: string): Promise<DrgResult> {
  return post<DrgResult>(`/drg/group/${visitId}`, {});
}

/** 查看某就诊分组结果。 */
export function fetchDrgResult(visitId: string): Promise<DrgResult> {
  return get<DrgResult>(`/drg/result/${visitId}`);
}

/** 医保办确认分组。 */
export function confirmDrgResult(id: string): Promise<DrgResult> {
  return post<DrgResult>(`/drg/confirm/${id}`, {});
}

/** 医保办退回分组。 */
export function rejectDrgResult(id: string, reason: string): Promise<DrgResult> {
  return post<DrgResult>(`/drg/reject/${id}`, { reason });
}
