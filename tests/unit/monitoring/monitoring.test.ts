/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 监控系统单元测试
 */

import { describe, expect, it } from 'bun:test';

import { ErrorMonitor } from '../../../src/core/monitoring/ErrorMonitor';
import type { ErrorReport } from '../../../src/core/monitoring/ErrorMonitor';
import { HealthChecker } from '../../../src/core/monitoring/HealthChecker';
import { PerformanceMonitor } from '../../../src/core/monitoring/PerformanceMonitor';

describe('ErrorMonitor', () => {
  it('应聚合相同指纹并按阈值上报', async () => {
    const reports: ErrorReport[] = [];
    const monitor = new ErrorMonitor({
      attachGlobalHandlers: false,
      threshold: 2,
      aggregateWindowMs: 10_000,
      reporter: { report: async (r) => void reports.push(r) },
    });

    const err = new Error('boom');
    monitor.capture(err, { context: { operation: 'test' } });
    monitor.capture(err, { context: { operation: 'test' } });
    // reporter 是异步调用，让出微任务
    await Bun.sleep(5);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.count).toBe(2);
  });

  it('低于阈值不应上报', () => {
    const reports: ErrorReport[] = [];
    const monitor = new ErrorMonitor({
      attachGlobalHandlers: false,
      threshold: 3,
      reporter: { report: async (r) => void reports.push(r) },
    });
    monitor.capture(new Error('one'));
    monitor.capture(new Error('two'));
    expect(reports).toHaveLength(0);
  });
});

describe('PerformanceMonitor', () => {
  it('应记录耗时并触发告警', () => {
    const pm = new PerformanceMonitor(100);
    const alerts: string[] = [];
    pm.onAlert((a) => alerts.push(a.name));
    pm.record({ name: 'slow', durationMs: 500, at: Date.now() });
    pm.record({ name: 'fast', durationMs: 10, at: Date.now() });
    expect(alerts).toEqual(['slow']);
    expect(pm.percentile('slow', 50)).toBe(500);
  });

  it('track() 应自动包裹耗时', async () => {
    const pm = new PerformanceMonitor(10_000);
    await pm.track('op', async () => {
      await new Promise((r) => setTimeout(r, 5));
    });
    expect(pm.summary().op.count).toBe(1);
  });
});

describe('HealthChecker', () => {
  it('应聚合探针结果', async () => {
    const hc = new HealthChecker();
    hc.registerProbe({ name: 'his', check: () => true });
    hc.registerProbe({ name: 'pacs', check: () => false });
    const report = await hc.check();
    expect(report.status).toBe('unhealthy');
    expect(report.items.find((i) => i.name === 'pacs')!.status).toBe('unhealthy');
  });
});
