/**
 * 健澜AI原生医院操作系统OS - bff/prompt/metricsAggregator.ts
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
 *
 * 提示词指标闭环（技术文档 3.4.5）：人工处置记录（采纳 / 修改 / 拒绝 / 修改字符 /
 * Schema 失败）按 agentId + scenario + version 聚合，计算采纳率 / 修改率 / 拒绝率 /
 * 平均修改字符 / Schema 失败率；阈值告警写入 abnormalFlags；进程内存台账，后续接 DB 仓储。
 *
 * @module bff/prompt/metricsAggregator
 */

// ============================================================================
// 类型契约
// ============================================================================

/** 人工处置结果 */
export type DisposalOutcome = 'adopted' | 'modified' | 'rejected';

/** 单次人工处置记录 */
export interface DisposalRecord {
  agentId: string;
  scenario: string;
  version: string;
  /** 处置时间（ISO 8601） */
  at: string;
  outcome: DisposalOutcome;
  /** 修改字符数（modified 时填写） */
  modifiedChars?: number;
  /** 本次处置前是否发生 Schema 校验失败 */
  schemaFailure?: boolean;
}

/** 指标查询条件；均为精确匹配，未出现不约束 */
export interface PromptMetricQuery {
  agentId?: string;
  scenario?: string;
  version?: string;
  /** 时间窗标签（如 daily / weekly）；缺省 'all'，不参与记录过滤 */
  window?: string;
}

/** 聚合结果（口径对齐 3.4.5 与 3.4.2 PromptMetrics） */
export interface AggregatedMetrics {
  agentId: string;
  scenario: string;
  version: string;
  window: string;
  calls: number;
  adoptionRate: number;
  modificationRate: number;
  rejectionRate: number;
  avgModifiedChars: number;
  schemaFailureRate: number;
  abnormalFlags: string[];
}

/** 告警阈值配置（缺省值见 DEFAULT_THRESHOLDS） */
export interface MetricThresholds {
  modificationRate?: number;
  rejectionRate?: number;
  schemaFailureRate?: number;
  avgModifiedChars?: number;
}

const OUTCOMES: readonly DisposalOutcome[] = ['adopted', 'modified', 'rejected'];

/** 默认阈值：修改率 0.5、拒绝率 0.3、Schema 失败率 0.2、平均修改字符 500 */
const DEFAULT_THRESHOLDS: Required<MetricThresholds> = {
  modificationRate: 0.5,
  rejectionRate: 0.3,
  schemaFailureRate: 0.2,
  avgModifiedChars: 500,
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

// ============================================================================
// 指标聚合器（进程内存）
// ============================================================================

/** 提示词指标聚合器 */
export class PromptMetricsAggregator {
  private readonly records: DisposalRecord[] = [];
  private readonly thresholds: Required<MetricThresholds>;

  constructor(thresholds?: MetricThresholds) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...(thresholds ?? {}) };
  }

  /** 登记一次人工处置；必填 / 枚举校验，非法记录抛中文错误 */
  record(record: DisposalRecord): void {
    const errors: string[] = [];
    if (!isNonEmptyString(record.agentId)) errors.push('agentId 缺失或为空');
    if (!isNonEmptyString(record.scenario)) errors.push('scenario 缺失或为空');
    if (!isNonEmptyString(record.version)) errors.push('version 缺失或为空');
    if (!isNonEmptyString(record.at)) errors.push('at 缺失或为空');
    if (!OUTCOMES.includes(record.outcome)) errors.push(`outcome「${String(record.outcome)}」非法`);
    if (record.modifiedChars !== undefined && (!Number.isFinite(record.modifiedChars) || record.modifiedChars < 0)) {
      errors.push('modifiedChars 必须为非负有限数值');
    }
    if (errors.length > 0) {
      throw new Error(`[PM-001] 处置记录校验未通过：${errors.join('；')}`);
    }
    this.records.push(structuredClone(record));
  }

  /** 按 agentId + scenario + version 聚合；分母为 0 时各比率记 0 */
  query(query: PromptMetricQuery = {}): AggregatedMetrics[] {
    const filtered = this.records.filter(
      (record) =>
        (query.agentId === undefined || record.agentId === query.agentId) &&
        (query.scenario === undefined || record.scenario === query.scenario) &&
        (query.version === undefined || record.version === query.version),
    );

    const groups = new Map<string, DisposalRecord[]>();
    for (const record of filtered) {
      const key = `${record.agentId}｜${record.scenario}｜${record.version}`;
      const group = groups.get(key) ?? [];
      group.push(record);
      groups.set(key, group);
    }

    const window = query.window ?? 'all';
    return [...groups.values()].map((group) => this.aggregate(group, window));
  }

  /** 仅返回触发告警的聚合组 */
  listAlertFlags(): AggregatedMetrics[] {
    return this.query().filter((metrics) => metrics.abnormalFlags.length > 0);
  }

  private aggregate(records: DisposalRecord[], window: string): AggregatedMetrics {
    const calls = records.length;
    const adopted = records.filter((r) => r.outcome === 'adopted').length;
    const modified = records.filter((r) => r.outcome === 'modified').length;
    const rejected = records.filter((r) => r.outcome === 'rejected').length;
    const modifiedCharsList = records
      .filter((r) => r.outcome === 'modified' && typeof r.modifiedChars === 'number')
      .map((r) => r.modifiedChars as number);
    const schemaFailures = records.filter((r) => r.schemaFailure === true).length;

    const safe = (numerator: number) => (calls === 0 ? 0 : numerator / calls);
    const avgModifiedChars =
      modifiedCharsList.length === 0
        ? 0
        : modifiedCharsList.reduce((sum, chars) => sum + chars, 0) / modifiedCharsList.length;

    const base = records[0];
    const metrics: AggregatedMetrics = {
      agentId: base.agentId,
      scenario: base.scenario,
      version: base.version,
      window,
      calls,
      adoptionRate: safe(adopted),
      modificationRate: safe(modified),
      rejectionRate: safe(rejected),
      avgModifiedChars,
      schemaFailureRate: safe(schemaFailures),
      abnormalFlags: [],
    };

    if (metrics.modificationRate > this.thresholds.modificationRate)
      metrics.abnormalFlags.push('modificationRate-over-threshold');
    if (metrics.rejectionRate > this.thresholds.rejectionRate)
      metrics.abnormalFlags.push('rejectionRate-over-threshold');
    if (metrics.schemaFailureRate > this.thresholds.schemaFailureRate)
      metrics.abnormalFlags.push('schemaFailureRate-over-threshold');
    if (metrics.avgModifiedChars > this.thresholds.avgModifiedChars)
      metrics.abnormalFlags.push('avgModifiedChars-over-threshold');

    return metrics;
  }
}

// ============================================================================
// 模块级单例与测试重置
// ============================================================================

let _aggregator: PromptMetricsAggregator | null = null;

/** 获取进程级指标聚合器单例 */
export function getPromptMetricsAggregator(): PromptMetricsAggregator {
  if (!_aggregator) _aggregator = new PromptMetricsAggregator();
  return _aggregator;
}

/** 测试专用：重置指标聚合器单例 */
export function _resetPromptMetricsAggregator(): void {
  _aggregator = null;
}
