/**
 * 健澜科技 jlmedaios - 科研专病队列 API 服务（M5-B）
 *
 * 真实 BFF（src/bff/routes/research.ts），全部读写 PostgreSQL，无 mock。
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { get, post, put } from '../request';
import type {
  CohortMember,
  CohortRunResult,
  CohortStats,
  CreateCohortInput,
  ResearchCohort,
} from '@/types/research';

/** 队列列表（可按状态过滤）。 */
export function fetchCohorts(status?: string): Promise<ResearchCohort[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return get<ResearchCohort[]>(`/research/cohorts${qs}`);
}

/** 创建队列（草稿）。 */
export function createCohortApi(input: CreateCohortInput): Promise<ResearchCohort> {
  return post<ResearchCohort>('/research/cohorts', input);
}

/** 队列详情。 */
export function fetchCohort(id: string): Promise<ResearchCohort> {
  return get<ResearchCohort>(`/research/cohorts/${id}`);
}

/** 编辑队列（仅草稿态）。 */
export function updateCohortApi(
  id: string,
  patch: Partial<CreateCohortInput>,
): Promise<ResearchCohort> {
  return put<ResearchCohort>(`/research/cohorts/${id}`, patch);
}

/** 发布队列（draft→active）。 */
export function publishCohort(id: string): Promise<ResearchCohort> {
  return post<ResearchCohort>(`/research/cohorts/${id}/publish`, {});
}

/** 归档队列。 */
export function archiveCohort(id: string): Promise<ResearchCohort> {
  return post<ResearchCohort>(`/research/cohorts/${id}/archive`, {});
}

/** 运行匹配（扫描患者，自动入组）。 */
export function runCohort(id: string): Promise<CohortRunResult> {
  return post<CohortRunResult>(`/research/cohorts/${id}/run`, {});
}

/** 队列成员。 */
export function fetchCohortMembers(
  id: string,
  offset = 0,
  limit = 100,
): Promise<CohortMember[]> {
  return get<CohortMember[]>(
    `/research/cohorts/${id}/members?limit=${limit}&offset=${offset}`,
  );
}

/** 队列统计。 */
export function fetchCohortStats(id: string): Promise<CohortStats> {
  return get<CohortStats>(`/research/cohorts/${id}/stats`);
}

/** 导出脱敏数据集。 */
export function exportCohort(id: string): Promise<Array<Record<string, unknown>>> {
  return get<Array<Record<string, unknown>>>(`/research/cohorts/${id}/export`);
}
