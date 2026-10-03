/* ============================================================================
 * 健澜科技杠OS - 数据治理类型定义（M5-E）
 *
 * 对应后端 src/bff/aggregators/dataGovernanceAggregator.ts 的视图结构。
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

export type QualityDimension =
  | 'completeness'
  | 'uniqueness'
  | 'validity'
  | 'consistency'
  | 'timeliness';

export type Severity = 'critical' | 'major' | 'minor';

/** 质量检测运行概览。 */
export interface QualityRunView {
  runId: string;
  status: string;
  totalRules: number;
  passedRules: number;
  failedRules: number;
  score: number;
  startedAt: string;
  finishedAt: string | null;
}

/** 单条规则的检测结果。 */
export interface RuleResultView {
  ruleCode: string;
  ruleName: string;
  dimension: string;
  severity: string;
  target: string;
  totalRows: number;
  passedRows: number;
  failedRows: number;
  passRate: number;
  status: 'pass' | 'fail';
  failedSample: unknown[];
}

/** 质量规则定义。 */
export interface DqRuleView {
  ruleCode: string;
  ruleName: string;
  dimension: QualityDimension;
  targetSchema: string;
  targetTable: string;
  targetColumn: string | null;
  checkType: string;
  params: Record<string, unknown>;
  severity: Severity;
  enabled: boolean;
}

/** 字段级隐私分级台账。 */
export interface ClassificationView {
  schemaName: string;
  tableName: string;
  columnName: string;
  level: number;
  source: 'auto' | 'manual';
  reason: string | null;
  overriddenByName: string | null;
  updatedAt: string;
}

/** 触发质量检测的完整结果。 */
export interface QualityRunSummary {
  runId: string;
  status: 'success' | 'failed';
  totalRules: number;
  passedRules: number;
  failedRules: number;
  score: number;
  startedAt: string;
  finishedAt: string;
  results: RuleResultView[];
}

/** 自动扫描分级结果。 */
export interface ScanClassificationResult {
  scanned: number;
  classified: number;
}
