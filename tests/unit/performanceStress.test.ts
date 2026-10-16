/**
 * 健澜科技 jlmedaios - 性能压测纯函数单测（M193-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildPerformanceStressTestReport,
  generatePerformanceOptimizationPlan,
  identifyPerformanceBottleneck,
  type StressTestData,
} from '../../src/bff/aggregators/performanceStressAggregator';

describe('identifyPerformanceBottleneck', () => {
  it('慢查询率高 → DB 瓶颈', () => {
    const data: StressTestData = { concurrentUsers: 1000, qps: 2000, avgResponseTime: 100, p95ResponseTime: 400, p99ResponseTime: 800, errorRate: 0.001, dbSlowQueryRate: 0.08, dbLockWaitRate: 0.01, cacheHitRate: 0.9, cpuUsage: 0.6, memoryUsage: 0.6 };
    expect(identifyPerformanceBottleneck(data).bottleneck).toContain('数据库');
  });

  it('缓存命中率低 → 缓存瓶颈', () => {
    const data: StressTestData = { concurrentUsers: 1000, qps: 2000, avgResponseTime: 100, p95ResponseTime: 400, p99ResponseTime: 800, errorRate: 0.001, dbSlowQueryRate: 0.01, dbLockWaitRate: 0.01, cacheHitRate: 0.7, cpuUsage: 0.6, memoryUsage: 0.6 };
    expect(identifyPerformanceBottleneck(data).bottleneck).toContain('缓存');
  });

  it('CPU 高 → CPU 瓶颈', () => {
    const data: StressTestData = { concurrentUsers: 1000, qps: 2000, avgResponseTime: 100, p95ResponseTime: 400, p99ResponseTime: 800, errorRate: 0.001, dbSlowQueryRate: 0.01, dbLockWaitRate: 0.01, cacheHitRate: 0.9, cpuUsage: 0.9, memoryUsage: 0.6 };
    expect(identifyPerformanceBottleneck(data).bottleneck).toContain('CPU');
  });

  it('正常 → 无瓶颈', () => {
    const data: StressTestData = { concurrentUsers: 1000, qps: 2000, avgResponseTime: 100, p95ResponseTime: 200, p99ResponseTime: 300, errorRate: 0.001, dbSlowQueryRate: 0.01, dbLockWaitRate: 0.01, cacheHitRate: 0.95, cpuUsage: 0.5, memoryUsage: 0.5 };
    expect(identifyPerformanceBottleneck(data).severity).toBe('low');
  });
});

describe('generatePerformanceOptimizationPlan', () => {
  it('DB 瓶颈 → 生成 DB 优化', () => {
    const plans = generatePerformanceOptimizationPlan({ bottleneck: '数据库慢查询', severity: 'high' });
    expect(plans.length).toBeGreaterThan(0);
    expect(plans[0]).toContain('索引');
  });

  it('无瓶颈 → 生成持续监控', () => {
    const plans = generatePerformanceOptimizationPlan({ bottleneck: '无明显瓶颈', severity: 'low' });
    expect(plans[0]).toContain('持续监控');
  });
});

describe('buildPerformanceStressTestReport', () => {
  it('生成压测场景', () => {
    const r = buildPerformanceStressTestReport('7d');
    expect(r.scenarios.length).toBe(5);
  });

  it('生成瓶颈识别', () => {
    const r = buildPerformanceStressTestReport('7d');
    expect(r.bottleneck.bottleneck).toBeDefined();
  });

  it('生成优化方案', () => {
    const r = buildPerformanceStressTestReport('7d');
    expect(r.optimizationPlan.length).toBeGreaterThan(0);
  });
});
