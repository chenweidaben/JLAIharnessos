/* ============================================================================
 * 健澜科技杠OS - 数据治理 API 服务（M5-E）
 *
 * 真实 BFF（src/bff/routes/dataGovernance.ts），全部读写 PostgreSQL，无 mock。
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

import { get, post } from '../request';
import type {
  ClassificationView,
  DqRuleView,
  QualityRunSummary,
  QualityRunView,
  RuleResultView,
  ScanClassificationResult,
} from '@/types/dataGovernance';

/** 触发一次全量质量检测。 */
export function runQualityCheckApi(): Promise<QualityRunSummary> {
  return post<QualityRunSummary>('/data-governance/quality/run', {});
}

/** 最新一次质量检测概览。 */
export function fetchLatestRun(): Promise<QualityRunView | null> {
  return get<QualityRunView | null>('/data-governance/quality/latest');
}

/** 评分趋势。 */
export function fetchQualityTrend(limit = 10): Promise<QualityRunView[]> {
  return get<QualityRunView[]>(
    `/data-governance/quality/trend?limit=${limit}`,
  );
}

/** 某一次检测的逐规则结果。 */
export function fetchRunResults(
  runId?: string,
): Promise<{ run: QualityRunView; results: RuleResultView[] }> {
  const qs = runId ? `?runId=${encodeURIComponent(runId)}` : '';
  return get<{ run: QualityRunView; results: RuleResultView[] }>(
    `/data-governance/quality/results${qs}`,
  );
}

/** 质量规则清单。 */
export function fetchRules(): Promise<DqRuleView[]> {
  return get<DqRuleView[]>('/data-governance/rules');
}

/** 自动扫描列并分级。 */
export function scanClassificationApi(): Promise<ScanClassificationResult> {
  return post<ScanClassificationResult>(
    '/data-governance/classification/scan',
    {},
  );
}

/** 字段分级台账。 */
export function fetchClassification(filter?: {
  schema?: string;
  level?: number;
}): Promise<ClassificationView[]> {
  const params = new URLSearchParams();
  if (filter?.schema) params.set('schema', filter.schema);
  if (filter?.level) params.set('level', String(filter.level));
  const qs = params.toString();
  return get<ClassificationView[]>(
    `/data-governance/classification${qs ? `?${qs}` : ''}`,
  );
}

/** 人工修正字段分级。 */
export function overrideClassificationApi(input: {
  schemaName: string;
  tableName: string;
  columnName: string;
  level: number;
  reason?: string;
}): Promise<ClassificationView> {
  return post<ClassificationView>(
    '/data-governance/classification/override',
    input,
  );
}
