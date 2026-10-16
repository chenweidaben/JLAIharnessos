/**
 * 健澜科技 jlmedaios - 生产性能优化纯函数单测（M187-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildPerformanceReport,
  identifySlowQueries,
  suggestCacheStrategy,
  type QueryMetric,
} from '../../src/bff/aggregators/performanceReportAggregator';

describe('identifySlowQueries', () => {
  it('平均耗时 > 500ms 被识别为慢查询', () => {
    const queries: QueryMetric[] = [
      { query: 'fast', executionCount: 100, avgLatencyMs: 50, totalLatencyMs: 5000 },
      { query: 'slow', executionCount: 10, avgLatencyMs: 800, totalLatencyMs: 8000 },
    ];
    const slow = identifySlowQueries(queries);
    expect(slow.length).toBe(1);
    expect(slow[0].query).toBe('slow');
  });

  it('按总耗时降序排列', () => {
    const queries: QueryMetric[] = [
      { query: 'a', executionCount: 10, avgLatencyMs: 800, totalLatencyMs: 8000 },
      { query: 'b', executionCount: 10, avgLatencyMs: 1000, totalLatencyMs: 10000 },
    ];
    const slow = identifySlowQueries(queries);
    expect(slow[0].query).toBe('b');
  });
});

describe('suggestCacheStrategy', () => {
  it('高频读 → TTL 300s', () => {
    const s = suggestCacheStrategy('emr', [{ pattern: 'by_patient', frequency: 500 }]);
    expect(s.ttlSeconds).toBe(300);
  });

  it('低频读 → TTL 60s', () => {
    const s = suggestCacheStrategy('log', [{ pattern: 'by_id', frequency: 10 }]);
    expect(s.ttlSeconds).toBe(60);
  });
});

describe('buildPerformanceReport', () => {
  it('生成慢查询列表', () => {
    const r = buildPerformanceReport('24h');
    expect(r.slowQueries.length).toBeGreaterThan(0);
  });

  it('生成优化建议', () => {
    const r = buildPerformanceReport('24h');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });

  it('API 延迟 P50 < P95 < P99', () => {
    const r = buildPerformanceReport('24h');
    expect(r.apiLatency.p50).toBeLessThan(r.apiLatency.p95);
    expect(r.apiLatency.p95).toBeLessThan(r.apiLatency.p99);
  });
});
