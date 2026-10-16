/**
 * 健澜科技 jlmedaios - 运营 V3 纯函数单测（M207-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildOperationsReportV3,
  calculateCostEfficiency,
  forecastVolume,
} from '../../src/bff/aggregators/operationsReportV3Aggregator';

describe('calculateCostEfficiency', () => {
  it('成本 80 收入 100 → 盈利', () => {
    const r = calculateCostEfficiency(80, 100);
    expect(r.profitable).toBe(true);
    expect(r.margin).toBe(20);
  });

  it('成本 120 收入 100 → 亏损', () => {
    const r = calculateCostEfficiency(120, 100);
    expect(r.profitable).toBe(false);
  });
});

describe('forecastVolume', () => {
  it('平均 10000 趋势 1.1 → 11000', () => {
    expect(forecastVolume([10000, 10000, 10000], 1.1)).toBe(11000);
  });

  it('空数组 → 0', () => {
    expect(forecastVolume([], 1.1)).toBe(0);
  });
});

describe('buildOperationsReportV3', () => {
  it('生成门诊数据', () => {
    const r = buildOperationsReportV3('30d');
    expect(r.outpatient.visits).toBeGreaterThan(0);
  });

  it('生成住院数据', () => {
    const r = buildOperationsReportV3('30d');
    expect(r.inpatient.admissions).toBeGreaterThan(0);
  });

  it('生成预测数据', () => {
    const r = buildOperationsReportV3('30d');
    expect(r.forecast.nextMonthVisits).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildOperationsReportV3('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
