/**
 * 健澜科技 jlmedaios - 环境保护纯函数单测（M220-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessWasteCompliance,
  buildEnvironmentReport,
  calculateRadiationDose,
} from '../../src/bff/aggregators/environmentReportAggregator';

describe('assessWasteCompliance', () => {
  it('100吨 5法规 → 20 合规', () => {
    const r = assessWasteCompliance(100, 5);
    expect(r.compliant).toBe(true);
  });

  it('1吨 10法规 → 0.1 不合规', () => {
    const r = assessWasteCompliance(1, 10);
    expect(r.compliant).toBe(false);
  });
});

describe('calculateRadiationDose', () => {
  it('20mSv 50mSv限值 → 不超标', () => {
    expect(calculateRadiationDose(20, 50).exceeded).toBe(false);
  });

  it('60mSv 50mSv限值 → 超标', () => {
    expect(calculateRadiationDose(60, 50).exceeded).toBe(true);
  });
});

describe('buildEnvironmentReport', () => {
  it('生成医废数据', () => {
    const r = buildEnvironmentReport('30d');
    expect(r.waste.medical).toBeGreaterThan(0);
  });

  it('生成污水数据', () => {
    const r = buildEnvironmentReport('30d');
    expect(r.sewage.discharge).toBeGreaterThan(0);
  });

  it('生成节能数据', () => {
    const r = buildEnvironmentReport('30d');
    expect(r.energy.saved).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildEnvironmentReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
