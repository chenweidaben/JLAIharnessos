/* ============================================================================
 * 健澜科技杠OS - 数据湖仓 API 服务（M5-D）
 *
 * 真实 BFF（src/bff/routes/dataWarehouse.ts），全部读写 PostgreSQL，无 mock。
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

import { get, post } from '../request';
import type {
  DeptDailySummaryView,
  HospitalDailyMetricView,
  JobCode,
  JobRunView,
  LineageView,
  PipelineRunSummary,
  RunMode,
} from '@/types/dataWarehouse';

/** 触发全量/增量 pipeline。 */
export function runPipelineApi(mode: RunMode): Promise<PipelineRunSummary> {
  return post<PipelineRunSummary>('/data-warehouse/pipeline', { mode });
}

/** 重跑单个作业。 */
export function runJobApi(jobCode: JobCode): Promise<PipelineRunSummary> {
  return post<PipelineRunSummary>(
    `/data-warehouse/jobs/${encodeURIComponent(jobCode)}/run`,
    {},
  );
}

/** 作业运行历史。 */
export function fetchJobRuns(jobCode?: string): Promise<JobRunView[]> {
  const qs = jobCode ? `?jobCode=${encodeURIComponent(jobCode)}` : '';
  return get<JobRunView[]>(`/data-warehouse/runs${qs}`);
}

/** 数据血缘。 */
export function fetchLineage(): Promise<LineageView[]> {
  return get<LineageView[]>('/data-warehouse/lineage');
}

/** 院级日指标。 */
export function fetchHospitalMetrics(
  range?: { from?: string; to?: string },
): Promise<HospitalDailyMetricView[]> {
  const params = new URLSearchParams();
  if (range?.from) params.set('from', range.from);
  if (range?.to) params.set('to', range.to);
  const qs = params.toString();
  return get<HospitalDailyMetricView[]>(
    `/data-warehouse/metrics${qs ? `?${qs}` : ''}`,
  );
}

/** 科室日汇总。 */
export function fetchDeptSummary(date?: string): Promise<DeptDailySummaryView[]> {
  const qs = date ? `?date=${encodeURIComponent(date)}` : '';
  return get<DeptDailySummaryView[]>(`/data-warehouse/dept-summary${qs}`);
}
