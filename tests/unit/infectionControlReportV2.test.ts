/**
 * 健澜科技 jlmedaios - 院感 V2 纯函数单测（M209-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessMDROControl,
  buildInfectionControlReportV2,
  calculateInfectionRate,
  type MDROIsolates,
} from '../../src/bff/aggregators/infectionControlReportV2Aggregator';

describe('calculateInfectionRate', () => {
  it('50 例 / 10000 床日 → 5‰ 偏高', () => {
    const r = calculateInfectionRate(50, 10000);
    expect(r.rate).toBe(5);
    expect(r.level).toBe('偏高');
  });

  it('10 例 / 10000 床日 → 1‰ 达标', () => {
    const r = calculateInfectionRate(10, 10000);
    expect(r.level).toBe('达标');
  });
});

describe('assessMDROControl', () => {
  it('100 株 → 预警', () => {
    const i: MDROIsolates = { mrsa: 30, vre: 20, cre: 20, crab: 20, cdiff: 10 };
    const r = assessMDROControl(i);
    expect(r.total).toBe(100);
    expect(r.control).toBe('预警');
  });

  it('20 株 → 良好', () => {
    const i: MDROIsolates = { mrsa: 5, vre: 5, cre: 5, crab: 3, cdiff: 2 };
    const r = assessMDROControl(i);
    expect(r.control).toBe('良好');
  });
});

describe('buildInfectionControlReportV2', () => {
  it('生成监测数据', () => {
    const r = buildInfectionControlReportV2('30d');
    expect(r.surveillance.overall).toBeGreaterThan(0);
  });

  it('生成目标监测数据', () => {
    const r = buildInfectionControlReportV2('30d');
    expect(r.target.ssi).toBeGreaterThanOrEqual(0);
  });

  it('生成MDRO数据', () => {
    const r = buildInfectionControlReportV2('30d');
    expect(r.mdro.mrsa).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildInfectionControlReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
