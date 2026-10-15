/**
 * 健澜科技 jlmedaios - 系统监控指标聚合器纯函数单测（M145-C 生产化收尾）
 *
 * 覆盖：recordSystemMetric（指标记录归一）/ getMetricTrend（趋势聚合）/
 * evaluateAlerts（超阈值自动告警：P95>1s / 错误率>1% / 内存>90%）/
 * buildDashboardView（仪表盘视图装配）。全部为纯函数用例，不触碰进程缓冲与 IO。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  ALERT_RULES,
  buildDashboardView,
  evaluateAlerts,
  getMetricTrend,
  recordSystemMetric,
  type Metric,
} from '../../src/bff/aggregators/systemMetricsAggregator';

/* 固定参照时间：2026-10-16 12:00:00 UTC，避免本地时区分桶漂移 */
const NOW = Date.UTC(2026, 9, 16, 12, 0, 0);
const HOUR_MS = 3_600_000;

/** 构造指标记录（纯函数，不碰进程缓冲） */
function metric(type: string, value: number, at: number, tags: Record<string, string> = {}): Metric {
  return recordSystemMetric(type, value, tags, at);
}

describe('recordSystemMetric（指标记录）', () => {
  it('归一为结构化 Metric，保留类型 / 数值 / 标签 / 采样时间', () => {
    const m = metric('memory_usage', 85.5, 1000, { scope: 'bff' });
    expect(m).toEqual({
      type: 'memory_usage',
      value: 85.5,
      tags: { scope: 'bff' },
      recordedAt: 1000,
    });
  });

  it('负值（异常采样）防御为 0，非数值防御为 0，不抛错', () => {
    expect(metric('error_rate', -0.5, 1).value).toBe(0);
    expect(metric('online_users', Number.NaN, 1).value).toBe(0);
    expect(metric('online_users', Number.POSITIVE_INFINITY, 1).value).toBe(0);
  });

  it('入参 tags 深拷贝，调用方后续修改不影响结果', () => {
    const input = { route: '/api/v1/a' };
    const m = metric('api_latency_p95', 120, 1, input);
    input.route = 'mutated';
    expect(m.tags.route).toBe('/api/v1/a');
  });

  it('默认 tags 为空对象、recordedAt 默认 0 且负数防御为 0', () => {
    const m = recordSystemMetric('cpu_usage', 10);
    expect(m.tags).toEqual({});
    expect(m.recordedAt).toBe(0);
    expect(metric('cpu_usage', 10, -99).recordedAt).toBe(0);
  });
});

describe('getMetricTrend（趋势聚合）', () => {
  it('空输入 / hours<=0 → 空趋势（latest 为 null）', () => {
    expect(getMetricTrend([], 'memory_usage', 1, NOW)).toEqual({
      metricType: 'memory_usage',
      hours: 1,
      points: [],
      latest: null,
    });
    expect(getMetricTrend([metric('memory_usage', 80, NOW)], 'memory_usage', 0, NOW).points).toEqual([]);
    expect(getMetricTrend([metric('memory_usage', 80, NOW)], 'memory_usage', -3, NOW).latest).toBeNull();
  });

  it('只保留窗口内样本，按整点小时分桶，latest 取最新值', () => {
    const records = [
      metric('memory_usage', 80, NOW - 30 * 60_000), // 11:30 桶内
      metric('memory_usage', 90, NOW - 15 * 60_000), // 11:45 同桶
      metric('memory_usage', 50, NOW - 2 * HOUR_MS), // 10:00 窗口外
      metric('memory_usage', 70, NOW + 10 * 60_000), // 12:10 未来样本
      metric('cpu_usage', 33, NOW - 10 * 60_000), // 其他类型，应被忽略
    ];
    const trend = getMetricTrend(records, 'memory_usage', 1, NOW);
    expect(trend.points).toHaveLength(1);
    expect(trend.points[0]).toEqual({
      bucketStart: Date.UTC(2026, 9, 16, 11, 0, 0),
      avg: 85,
      max: 90,
      count: 2,
    });
    expect(trend.latest).toBe(90);
  });

  it('不修改入参', () => {
    const records = [metric('cpu_usage', 30, NOW), metric('cpu_usage', 40, NOW - 60_000)];
    const snapshot = records.map((r) => ({ ...r, tags: { ...r.tags } }));
    getMetricTrend(records, 'cpu_usage', 1, NOW);
    expect(records).toEqual(snapshot);
  });
});

describe('evaluateAlerts（超阈值自动告警）', () => {
  it('无样本 → 不告警（避免冷启动误报）', () => {
    expect(evaluateAlerts([])).toEqual([]);
  });

  it('全部健康 → 不告警', () => {
    const records = [
      metric('api_latency_p95', 500, NOW),
      metric('error_rate', 0.005, NOW),
      metric('memory_usage', 70, NOW),
    ];
    expect(evaluateAlerts(records)).toEqual([]);
  });

  it('P95 超过 1s → warning；达阈值 2 倍 → critical', () => {
    const warn = evaluateAlerts([metric('api_latency_p95', 1500, NOW)]);
    expect(warn).toHaveLength(1);
    expect(warn[0].level).toBe('warning');
    expect(warn[0].threshold).toBe(1000);

    const crit = evaluateAlerts([metric('api_latency_p95', 2500, NOW)]);
    expect(crit[0].level).toBe('critical');
  });

  it('错误率超过 1%（0.01）→ warning；>=2% → critical', () => {
    const records = [metric('error_rate', 0.015, NOW)];
    const alerts = evaluateAlerts(records);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].level).toBe('warning');

    expect(evaluateAlerts([metric('error_rate', 0.03, NOW)])[0].level).toBe('critical');
  });

  it('内存使用率超过 90% → warning', () => {
    const alerts = evaluateAlerts([metric('memory_usage', 95, NOW)]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('memory_usage');
    expect(alerts[0].level).toBe('warning');
  });

  it('多个指标同时越阈 → 同时产出多条告警，且只看最新值', () => {
    const records = [
      metric('api_latency_p95', 3000, NOW - 2 * HOUR_MS), // 历史越阈
      metric('api_latency_p95', 500, NOW), // 最新已恢复 → 不告警
      metric('error_rate', 0.02, NOW),
      metric('memory_usage', 96, NOW),
    ];
    const alerts = evaluateAlerts(records);
    expect(alerts).toHaveLength(2);
    expect(alerts.map((a) => a.type).sort()).toEqual(['error_rate', 'memory_usage']);
  });
});

describe('buildDashboardView（仪表盘视图装配）', () => {
  it('空输入：八类指标 latest 全为 null、无告警、规则定义完整', () => {
    const view = buildDashboardView([], 1);
    expect(view.windowHours).toBe(1);
    expect(view.latest).toHaveLength(8);
    expect(view.latest.every((r) => r.value === null)).toBe(true);
    expect(view.alerts).toEqual([]);
    expect(view.rules).toHaveLength(ALERT_RULES.length);
  });

  it('装配最新值 / 趋势 / 告警三类视图', () => {
    const records = [
      metric('api_latency_p95', 1500, NOW - 60_000),
      metric('memory_usage', 88, NOW - 2 * 60_000),
    ];
    const view = buildDashboardView(records, 1, NOW);
    expect(view.trends).toHaveLength(8);
    const p95 = view.trends.find((t) => t.metricType === 'api_latency_p95');
    expect(p95?.latest).toBe(1500);
    expect(view.alerts).toHaveLength(1);
    expect(view.alerts[0].type).toBe('api_latency_p95');
    expect(view.latest.find((r) => r.type === 'memory_usage')?.value).toBe(88);
  });
});
