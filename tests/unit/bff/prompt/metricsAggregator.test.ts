/**
 * 健澜AI原生医院操作系统OS - 提示词指标聚合单元测试（S-04）
 *
 * 覆盖：采纳 / 修改 / 拒绝 / 修改字符 / Schema 失败记录、比率与均值口径、
 * 分母为 0 记 0、阈值告警 abnormalFlags、按 agentId / scenario / version / window 过滤。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, it } from 'bun:test';

import {
  PromptMetricsAggregator,
  getPromptMetricsAggregator,
  _resetPromptMetricsAggregator,
  type DisposalRecord,
} from '@/bff/prompt/metricsAggregator.js';

const NOW = '2026-10-26T08:00:00.000Z';

function baseRecord(overrides: Partial<DisposalRecord> = {}): DisposalRecord {
  return {
    agentId: 'ag-01',
    scenario: 'outpatient-record',
    version: '1.0.0',
    at: NOW,
    outcome: 'adopted',
    ...overrides,
  };
}

beforeEach(() => {
  _resetPromptMetricsAggregator();
});

// ============================================================================
// 聚合口径
// ============================================================================

describe('PromptMetricsAggregator - 聚合口径', () => {
  it('采纳 / 修改 / 拒绝 / 修改字符 / Schema 失败比率与均值计算正确', () => {
    const aggregator = getPromptMetricsAggregator();
    aggregator.record(baseRecord({ outcome: 'adopted' }));
    aggregator.record(baseRecord({ outcome: 'modified', modifiedChars: 120 }));
    aggregator.record(baseRecord({ outcome: 'modified', modifiedChars: 680 }));
    aggregator.record(baseRecord({ outcome: 'rejected', schemaFailure: true }));

    const [metrics] = aggregator.query();
    expect(metrics.calls).toBe(4);
    expect(metrics.adoptionRate).toBeCloseTo(0.25, 6);
    expect(metrics.modificationRate).toBeCloseTo(0.5, 6);
    expect(metrics.rejectionRate).toBeCloseTo(0.25, 6);
    expect(metrics.avgModifiedChars).toBe(400);
    expect(metrics.schemaFailureRate).toBeCloseTo(0.25, 6);
    expect(metrics.window).toBe('all');
  });

  it('空台账 query 返回空数组，不产生分母为 0 的分组', () => {
    const aggregator = getPromptMetricsAggregator();
    expect(aggregator.query()).toEqual([]);
  });

  it('query 按 agentId / scenario / version 精确过滤，window 标签透传', () => {
    const aggregator = getPromptMetricsAggregator();
    aggregator.record(baseRecord());
    aggregator.record(baseRecord({ agentId: 'ag-02', scenario: 'consultation', version: '1.2.0' }));

    const byAgent = aggregator.query({ agentId: 'ag-01' });
    expect(byAgent).toHaveLength(1);
    expect(byAgent[0].agentId).toBe('ag-01');

    const byScenario = aggregator.query({ scenario: 'consultation' });
    expect(byScenario).toHaveLength(1);
    expect(byScenario[0].version).toBe('1.2.0');

    const byVersion = aggregator.query({ version: '1.2.0', window: 'daily' });
    expect(byVersion).toHaveLength(1);
    expect(byVersion[0].window).toBe('daily');
  });
});

// ============================================================================
// 阈值告警
// ============================================================================

describe('PromptMetricsAggregator - 阈值告警', () => {
  it('修改率 / 拒绝率 / Schema 失败率 / 平均修改字符超阈值写入对应 abnormalFlags', () => {
    const aggregator = new PromptMetricsAggregator({
      modificationRate: 0.4,
      rejectionRate: 0.2,
      schemaFailureRate: 0.1,
      avgModifiedChars: 300,
    });
    aggregator.record(baseRecord({ outcome: 'modified', modifiedChars: 400 }));
    aggregator.record(baseRecord({ outcome: 'modified', modifiedChars: 500 }));
    aggregator.record(baseRecord({ outcome: 'rejected', schemaFailure: true }));

    const [metrics] = aggregator.query();
    expect(metrics.abnormalFlags).toContain('modificationRate-over-threshold');
    expect(metrics.abnormalFlags).toContain('rejectionRate-over-threshold');
    expect(metrics.abnormalFlags).toContain('schemaFailureRate-over-threshold');
    expect(metrics.abnormalFlags).toContain('avgModifiedChars-over-threshold');
  });

  it('listAlertFlags 只返回触发告警的聚合组', () => {
    const aggregator = new PromptMetricsAggregator({ modificationRate: 0.5 });
    // 正常组：全部采纳，无告警
    aggregator.record(baseRecord());
    aggregator.record(baseRecord());
    // 告警组：修改率 1.0
    aggregator.record(baseRecord({ agentId: 'ag-02', scenario: 'consultation', version: '2.0.0', outcome: 'modified', modifiedChars: 120 }));

    const alerts = aggregator.listAlertFlags();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].agentId).toBe('ag-02');
    expect(alerts[0].abnormalFlags).toContain('modificationRate-over-threshold');
  });

  it('未超阈值不写入告警标记', () => {
    const aggregator = new PromptMetricsAggregator();
    aggregator.record(baseRecord({ outcome: 'adopted' }));
    aggregator.record(baseRecord({ outcome: 'adopted' }));
    const [metrics] = aggregator.query();
    expect(metrics.abnormalFlags).toEqual([]);
  });
});

// ============================================================================
// 记录校验
// ============================================================================

describe('PromptMetricsAggregator - 记录校验', () => {
  it('缺少 agentId / scenario / version / at 抛中文错误', () => {
    const aggregator = getPromptMetricsAggregator();
    expect(() => aggregator.record(baseRecord({ agentId: '' }))).toThrow(/PM-001/);
    expect(() => aggregator.record(baseRecord({ scenario: '' }))).toThrow(/PM-001/);
    expect(() => aggregator.record(baseRecord({ version: '' }))).toThrow(/PM-001/);
    expect(() => aggregator.record(baseRecord({ at: '' }))).toThrow(/PM-001/);
  });

  it('outcome 非法枚举被拒绝；modifiedChars 负数被拒绝', () => {
    const aggregator = getPromptMetricsAggregator();
    expect(() => aggregator.record(baseRecord({ outcome: 'pending' as never }))).toThrow(/PM-001/);
    expect(() => aggregator.record(baseRecord({ outcome: 'modified', modifiedChars: -5 }))).toThrow(/PM-001/);
  });
});
