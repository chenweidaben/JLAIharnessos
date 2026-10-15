/**
 * 健澜科技 jlmedaios - 性能监控聚合器纯函数单测（M123-D）
 *
 * 覆盖：measurePerformance / computePercentiles / identifySlowRoutes /
 * aggregatePerformance。全部为纯函数用例，不触碰进程内缓冲与 IO。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  aggregatePerformance,
  computePercentiles,
  identifySlowRoutes,
  measurePerformance,
  type PerformanceRecord,
} from '../../src/bff/aggregators/performanceMonitorAggregator';

/* 用 UTC 中午的时间戳，保证本地日期（Asia/Shanghai UTC+8）与 UTC 日期一致，
   避免按天分桶用例跨时区漂移 */
const DAY_A = Date.UTC(2026, 9, 15, 12, 0, 0); // 2026-10-15
const DAY_B = Date.UTC(2026, 9, 16, 12, 0, 0); // 2026-10-16

function rec(
  route: string,
  durationMs: number,
  statusCode = 200,
  at: number = DAY_A,
): PerformanceRecord {
  return measurePerformance(route, at, at + durationMs, statusCode);
}

describe('measurePerformance', () => {
  it('计算耗时并按状态码标记错误', () => {
    const r = measurePerformance('/api/v1/a', 1000, 1234, 200);
    expect(r.durationMs).toBe(234);
    expect(r.isError).toBe(false);
    expect(r.recordedAt).toBe(1234);

    const e = measurePerformance('/api/v1/a', 1000, 1500, 500);
    expect(e.isError).toBe(true);
    expect(e.statusCode).toBe(500);
  });

  it('负时长（时钟回拨）防御为 0，不抛错', () => {
    const r = measurePerformance('/api/v1/a', 2000, 1000);
    expect(r.durationMs).toBe(0);
  });

  it('默认状态码为 200', () => {
    expect(measurePerformance('/x', 0, 10).statusCode).toBe(200);
    expect(measurePerformance('/x', 0, 10).isError).toBe(false);
  });
});

describe('computePercentiles', () => {
  it('空样本 → 全 0', () => {
    expect(computePercentiles([])).toEqual({ p50: 0, p95: 0, p99: 0 });
  });

  it('单样本 → 全部等于该样本', () => {
    expect(computePercentiles([42])).toEqual({ p50: 42, p95: 42, p99: 42 });
  });

  it('1..100 等距序列 → nearest-rank 命中 50 / 95 / 99', () => {
    const samples = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(computePercentiles(samples)).toEqual({ p50: 50, p95: 95, p99: 99 });
  });

  it('1..10 短序列 → p95/p99 均取最大值', () => {
    expect(computePercentiles([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toEqual({
      p50: 5,
      p95: 10,
      p99: 10,
    });
  });

  it('过滤非数值，不在入参上原地排序', () => {
    const input = [30, 10, 20, Number.NaN, Infinity as unknown as number];
    // 入参顺序不变
    const snapshot = [...input];
    computePercentiles(input);
    expect(input).toEqual(snapshot);
    // 有效样本 [10,20,30]：p50 = 20（ceil(1.5)=2 → idx1）
    expect(computePercentiles(input)).toEqual({ p50: 20, p95: 30, p99: 30 });
  });
});

describe('identifySlowRoutes', () => {
  it('按路由聚合，平均耗时超过阈值才入选，按平均耗时降序', () => {
    const records = [
      rec('/fast', 50),
      rec('/fast', 70), // avg 60
      rec('/slow', 800),
      rec('/slow', 1200), // avg 1000
      rec('/mid', 300), // avg 300
    ];
    const slow = identifySlowRoutes(records, 200);
    expect(slow).toHaveLength(2);
    expect(slow[0].route).toBe('/slow');
    expect(slow[0].avgDurationMs).toBe(1000);
    expect(slow[0].count).toBe(2);
    expect(slow[0].p95DurationMs).toBe(1200);
    expect(slow[0].maxDurationMs).toBe(1200);
    expect(slow[1].route).toBe('/mid');
  });

  it('错误条数正确统计', () => {
    const records = [
      rec('/r', 500),
      rec('/r', 600, 500),
      rec('/r', 700, 503),
    ];
    const slow = identifySlowRoutes(records, 100);
    expect(slow[0].errorCount).toBe(2);
  });

  it('阈值 <= 0 或空输入 → 空集', () => {
    expect(identifySlowRoutes([], 100)).toEqual([]);
    expect(identifySlowRoutes([rec('/a', 500)], 0)).toEqual([]);
    expect(identifySlowRoutes([rec('/a', 500)], -10)).toEqual([]);
  });
});

describe('aggregatePerformance', () => {
  it('空输入 → 全零汇总', () => {
    expect(aggregatePerformance([])).toEqual({
      dailyRequests: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      slowTop10: [],
      errorRateTrend: [],
    });
  });

  it('请求量 / 分位数 / Top10 截断 / 按天错误率趋势', () => {
    const records: PerformanceRecord[] = [
      rec('/api/v1/a', 100, 200, DAY_A),
      rec('/api/v1/a', 200, 200, DAY_A),
      rec('/api/v1/b', 900, 500, DAY_A), // 错误
      rec('/api/v1/c', 50, 200, DAY_B),
    ];
    const summary = aggregatePerformance(records);

    expect(summary.dailyRequests).toBe(4);
    // durations = [100,200,900,50] sorted [50,100,200,900]
    // n=4: p50 ceil(2)=2 → idx1=100; p95 ceil(3.8)=4 → idx3=900; p99 ceil(3.96)=4 → 900
    expect(summary.p50).toBe(100);
    expect(summary.p95).toBe(900);
    expect(summary.p99).toBe(900);

    // Top10 按平均耗时降序：b(900) > a(150) > c(50)
    expect(summary.slowTop10.map((r) => r.route)).toEqual(['/api/v1/b', '/api/v1/a', '/api/v1/c']);
    expect(summary.slowTop10[0].errorCount).toBe(1);

    // 按天趋势：DAY_A 3 条 / 1 错；DAY_B 1 条 / 0 错
    expect(summary.errorRateTrend).toHaveLength(2);
    expect(summary.errorRateTrend[0]).toEqual({
      date: '2026-10-15',
      total: 3,
      errors: 1,
      errorRate: 0.3333,
    });
    expect(summary.errorRateTrend[1]).toEqual({
      date: '2026-10-16',
      total: 1,
      errors: 0,
      errorRate: 0,
    });
  });

  it('慢接口超过 10 个时只返回 Top10', () => {
    const records: PerformanceRecord[] = [];
    for (let i = 0; i < 15; i++) {
      records.push(rec(`/r${i}`, 1000 + i * 10));
    }
    const summary = aggregatePerformance(records);
    expect(summary.slowTop10).toHaveLength(10);
    // 最慢的是 /r14（1140ms）
    expect(summary.slowTop10[0].route).toBe('/r14');
    expect(summary.slowTop10[9].route).toBe('/r5');
  });

  it('不修改入参', () => {
    const records = [rec('/a', 200), rec('/b', 100)];
    const snapshot = records.map((r) => ({ ...r }));
    aggregatePerformance(records);
    expect(records).toEqual(snapshot);
  });
});
