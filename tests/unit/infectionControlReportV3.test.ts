/**
 * 健澜科技 jlmedaios - 院感控制 V3 纯函数单测（M229-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessMRSAControl,
  buildInfectionControlReportV3,
  calculateInfectionRate,
} from '../../src/bff/aggregators/infectionControlReportV3Aggregator';

describe('calculateInfectionRate', () => {
  it('5例感染 1000床日 → 5‰ 达标', () => {
    expect(calculateInfectionRate(5, 1000).target).toBe(true);
  });

  it('15例感染 1000床日 → 15‰ 不达标', () => {
    expect(calculateInfectionRate(15, 1000).target).toBe(false);
  });
});

describe('assessMRSAControl', () => {
  it('10例MRSA 10例隔离 → 100% 优秀', () => {
    expect(assessMRSAControl(10, 10).level).toBe('优秀');
  });

  it('10例MRSA 7例隔离 → 70% 一般', () => {
    expect(assessMRSAControl(10, 7).level).toBe('一般');
  });
});

describe('buildInfectionControlReportV3', () => {
  it('生成手卫生数据', () => {
    const r = buildInfectionControlReportV3('30d');
    expect(r.handHygiene.compliance).toBeGreaterThan(0);
  });

  it('生成MDRO数据', () => {
    const r = buildInfectionControlReportV3('30d');
    expect(r.mdro.mrsa).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildInfectionControlReportV3('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
