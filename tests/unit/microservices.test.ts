/**
 * 健澜科技 jlmedaios - 微服务纯函数单测（M197-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildMicroservicesReport,
  detectServiceAnomaly,
  mapServiceDependencies,
  type ServiceDependency,
  type ServiceMonitorData,
} from '../../src/bff/aggregators/microservicesAggregator';

describe('mapServiceDependencies', () => {
  it('计算上下游数量', () => {
    const services: ServiceDependency[] = [
      { service: 'user', dependsOn: [] },
      { service: 'order', dependsOn: ['user'] },
      { service: 'payment', dependsOn: ['user', 'order'] },
    ];
    const r = mapServiceDependencies(services);
    expect(r[0].downstream).toBe(2);
    expect(r[2].upstream).toBe(2);
  });
});

describe('detectServiceAnomaly', () => {
  it('错误率高 → 异常', () => {
    const data: ServiceMonitorData = { serviceName: 's1', qps: 1000, p99LatencyMs: 100, errorRate: 0.1, cpuUsage: 0.5 };
    expect(detectServiceAnomaly(data).anomaly).toBe(true);
  });

  it('正常 → 无异常', () => {
    const data: ServiceMonitorData = { serviceName: 's1', qps: 1000, p99LatencyMs: 100, errorRate: 0.001, cpuUsage: 0.5 };
    expect(detectServiceAnomaly(data).anomaly).toBe(false);
  });
});

describe('buildMicroservicesReport', () => {
  it('生成服务清单', () => {
    const r = buildMicroservicesReport('30d');
    expect(r.catalog.total).toBeGreaterThan(0);
  });

  it('生成治理规则', () => {
    const r = buildMicroservicesReport('30d');
    expect(r.governance.circuitBreaking).toBeGreaterThan(0);
  });

  it('生成追踪数据', () => {
    const r = buildMicroservicesReport('30d');
    expect(r.tracing.slowCalls).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildMicroservicesReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
