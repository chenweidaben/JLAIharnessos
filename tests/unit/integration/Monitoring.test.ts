/**
 * 健澜科技数智医院智能体 - 集成监控单元测试
 *
 * 版权所有 (c) 2026 健澜科技
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { IntegrationMonitor } from '../../../src/integration/monitoring/IntegrationMonitor';
import { IntegrationLogger } from '../../../src/integration/monitoring/IntegrationLogger';

describe('IntegrationMonitor', () => {
  beforeEach(() => {
    IntegrationMonitor.reset();
  });

  it('应记录调用并统计成功率', () => {
    const monitor = IntegrationMonitor.getInstance();
    monitor.recordCall({ adapterId: 'his-mock', method: 'getPatient', success: true, durationMs: 10, timestamp: Date.now() });
    monitor.recordCall({ adapterId: 'his-mock', method: 'getPatient', success: true, durationMs: 20, timestamp: Date.now() });
    monitor.recordCall({ adapterId: 'his-mock', method: 'getPatient', success: false, durationMs: 50, errorCode: 'E', timestamp: Date.now() });
    const health = monitor.getHealth('his-mock');
    expect(health?.totalCalls).toBe(3);
    expect(health?.successCalls).toBe(2);
    expect(health?.successRate).toBeCloseTo(2 / 3, 2);
  });

  it('连续失败应触发 critical 告警', () => {
    const monitor = IntegrationMonitor.getInstance();
    monitor.setRules({ consecutiveFailureThreshold: 3 });
    const alerts: string[] = [];
    monitor.onAlert((a) => alerts.push(a.rule));
    for (let i = 0; i < 5; i++) {
      monitor.recordCall({ adapterId: 'lis', method: 'getResult', success: false, durationMs: 10, errorCode: 'TIMEOUT', timestamp: Date.now() });
    }
    expect(alerts).toContain('consecutive_failures');
  });

  it('慢响应应触发 warning 告警', () => {
    const monitor = IntegrationMonitor.getInstance();
    monitor.setRules({ slowResponseMs: 100 });
    const alerts: string[] = [];
    monitor.onAlert((a) => alerts.push(a.rule));
    monitor.recordCall({ adapterId: 'pacs', method: 'getStudy', success: true, durationMs: 500, timestamp: Date.now() });
    expect(alerts).toContain('slow_response');
  });

  it('应导出 Prometheus 格式指标', () => {
    const monitor = IntegrationMonitor.getInstance();
    monitor.recordCall({ adapterId: 'his', method: 'getP', success: true, durationMs: 5, timestamp: Date.now() });
    const prom = monitor.exportPrometheus();
    expect(prom).toContain('jianlan_integration_calls_total');
    expect(prom).toContain('adapter="his"');
  });
});

describe('IntegrationLogger', () => {
  beforeEach(() => {
    IntegrationLogger.reset();
  });

  it('应记录请求/响应/错误/性能日志', () => {
    const logger = IntegrationLogger.getInstance();
    logger.logRequest('his', 'GET /patient');
    logger.logResponse('his', '200 OK', { ms: 5 });
    logger.logError('his', 'boom', { code: 'E' });
    logger.logPerformance('lis', 'slow', { ms: 500 });
    expect(logger.size()).toBe(4);
    expect(logger.errorCount()).toBe(1);
  });

  it('应支持按类别查询', () => {
    const logger = IntegrationLogger.getInstance();
    logger.logRequest('his', 'r1');
    logger.logError('his', 'e1');
    const errs = logger.query({ category: 'error' });
    expect(errs).toHaveLength(1);
    expect(errs[0].category).toBe('error');
  });

  it('应按上限轮转丢弃旧日志', () => {
    IntegrationLogger.reset();
    const logger = IntegrationLogger.getInstance({ maxEntries: 10 });
    for (let i = 0; i < 20; i++) {
      logger.logRequest('his', `req${i}`);
    }
    expect(logger.size()).toBe(10);
  });
});
