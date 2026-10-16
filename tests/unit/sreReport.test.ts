/**
 * 健澜科技 jlmedaios - SRE 纯函数单测（M216-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessAvailability,
  buildSREReport,
  calculateErrorBudget,
} from '../../src/bff/aggregators/sreReportAggregator';

describe('calculateErrorBudget', () => {
  it('SLO 99.9% 消耗 10 分钟 → 剩余预算', () => {
    const r = calculateErrorBudget(99.9, 10);
    expect(r.exhausted).toBe(false);
    expect(r.remaining).toBeGreaterThan(0);
  });

  it('SLO 99.9% 消耗 50 分钟 → 预算耗尽', () => {
    const r = calculateErrorBudget(99.9, 50);
    expect(r.exhausted).toBe(true);
  });
});

describe('assessAvailability', () => {
  it('9995 / 10000 → 99.95% 优秀', () => {
    const r = assessAvailability(9995, 10000);
    expect(r.level).toBe('优秀');
  });

  it('9800 / 10000 → 98% 待改进', () => {
    const r = assessAvailability(9800, 10000);
    expect(r.level).toBe('待改进');
  });
});

describe('buildSREReport', () => {
  it('生成SLO数据', () => {
    const r = buildSREReport('30d');
    expect(r.slo.availability).toBeGreaterThan(0);
  });

  it('生成监控数据', () => {
    const r = buildSREReport('30d');
    expect(r.monitoring.alerts).toBeGreaterThanOrEqual(0);
  });

  it('生成灾备数据', () => {
    const r = buildSREReport('30d');
    expect(r.disasterRecovery.rto).toBeGreaterThanOrEqual(0);
  });

  it('生成建议', () => {
    const r = buildSREReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
