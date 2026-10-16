/**
 * 健澜科技 jlmedaios - 生产运维纯函数单测（M201-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  analyzeProductionLog,
  buildProductionOpsReport,
  generateIncidentReview,
  type IncidentData,
  type LogEntry,
} from '../../src/bff/aggregators/productionOpsAggregator';

describe('analyzeProductionLog', () => {
  it('健康日志 → 健康', () => {
    const logs: LogEntry[] = [
      { level: 'INFO', message: 'ok', service: 'a', timestamp: 't' },
      { level: 'INFO', message: 'ok', service: 'b', timestamp: 't' },
    ];
    const r = analyzeProductionLog(logs);
    expect(r.errors).toBe(0);
    expect(r.health).toBe('健康');
  });

  it('多错误日志 → 严重', () => {
    const logs: LogEntry[] = Array.from({ length: 15 }, () => ({
      level: 'ERROR' as const, message: 'fail', service: 's1', timestamp: 't',
    }));
    const r = analyzeProductionLog(logs);
    expect(r.errors).toBeGreaterThan(10);
    expect(r.health).toBe('严重');
  });
});

describe('generateIncidentReview', () => {
  it('生成复盘', () => {
    const incident: IncidentData = {
      id: 'INC-001', severity: 'P1', description: '数据库宕机', durationMin: 30,
      impact: 'HIS 不可用', rootCause: '磁盘满', resolution: '扩容并清理',
    };
    const r = generateIncidentReview(incident);
    expect(r.summary).toContain('P1');
    expect(r.actionItems.length).toBeGreaterThan(0);
  });
});

describe('buildProductionOpsReport', () => {
  it('生成监控数据', () => {
    const r = buildProductionOpsReport('30d');
    expect(r.monitoring.services).toBeGreaterThan(0);
  });

  it('生成事故数据', () => {
    const r = buildProductionOpsReport('30d');
    expect(r.incidents.total).toBeGreaterThanOrEqual(0);
  });

  it('生成容量数据', () => {
    const r = buildProductionOpsReport('30d');
    expect(r.capacity.cpuAvg).toBeGreaterThanOrEqual(0);
  });

  it('生成建议', () => {
    const r = buildProductionOpsReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
