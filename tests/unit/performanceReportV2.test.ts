/**
 * 健澜科技 jlmedaios - 绩效 V2 纯函数单测（M211-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildPerformanceReportV2,
  calculatePerformanceScore,
  distributeBonus,
  type PerformanceIndicators,
} from '../../src/bff/aggregators/performanceReportV2Aggregator';

describe('calculatePerformanceScore', () => {
  it('四维 90 → 总分 90 A', () => {
    const i: PerformanceIndicators = { workload: 90, cost: 90, risk: 90, satisfaction: 90 };
    const r = calculatePerformanceScore(i);
    expect(r.total).toBe(90);
    expect(r.level).toBe('A');
  });

  it('四维 70 → 总分 70 C', () => {
    const i: PerformanceIndicators = { workload: 70, cost: 70, risk: 70, satisfaction: 70 };
    const r = calculatePerformanceScore(i);
    expect(r.level).toBe('C');
  });
});

describe('distributeBonus', () => {
  it('总额 100 万 权重 [4,2,2,2] → 40/20/20/20', () => {
    const r = distributeBonus(100, [4, 2, 2, 2]);
    expect(r.amounts[0]).toBe(40);
    expect(r.amounts[1]).toBe(20);
    expect(r.sum).toBe(100);
  });
});

describe('buildPerformanceReportV2', () => {
  it('生成院级数据', () => {
    const r = buildPerformanceReportV2('30d');
    expect(r.hospital.score).toBeGreaterThan(0);
  });

  it('生成科室数据', () => {
    const r = buildPerformanceReportV2('30d');
    expect(r.dept.count).toBeGreaterThan(0);
  });

  it('生成分配数据', () => {
    const r = buildPerformanceReportV2('30d');
    expect(r.distribution.workload).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildPerformanceReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
