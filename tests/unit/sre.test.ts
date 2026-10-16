/**
 * 健澜科技 jlmedaios - SRE 纯函数单测（M197-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildSREReport,
  calculateErrorBudget,
  triageAlert,
  type AlertData,
} from '../../src/bff/aggregators/sreAggregator';

describe('calculateErrorBudget', () => {
  it('计算剩余错误预算', () => {
    const r = calculateErrorBudget({ target: 0.999 }, { availability: 0.9995 });
    expect(r.total).toBeCloseTo(0.001);
    expect(r.remaining).toBeGreaterThan(0);
  });

  it('预算耗尽 → 消耗为正', () => {
    const r = calculateErrorBudget({ target: 0.999 }, { availability: 0.998 });
    expect(r.consumed).toBeGreaterThan(0);
  });
});

describe('triageAlert', () => {
  it('严重+多服务 → P0', () => {
    const alert: AlertData = { severity: 'critical', affectedServices: 10, durationMinutes: 30 };
    expect(triageAlert(alert).priority).toBe('P0');
  });

  it('info → P3', () => {
    const alert: AlertData = { severity: 'info', affectedServices: 1, durationMinutes: 10 };
    expect(triageAlert(alert).priority).toBe('P3');
  });
});

describe('buildSREReport', () => {
  it('生成 SLO 数据', () => {
    const r = buildSREReport('30d');
    expect(r.slo.availability).toBeGreaterThan(0.99);
  });

  it('生成错误预算', () => {
    const r = buildSREReport('30d');
    expect(r.errorBudget.total).toBeGreaterThan(0);
  });

  it('生成事件数据', () => {
    const r = buildSREReport('30d');
    expect(r.incidents.total).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildSREReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
