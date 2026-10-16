/**
 * 健澜科技 jlmedaios - 公共卫生纯函数单测（M192-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildPublicHealthReport,
  calculateChronicDiseaseControlRate,
  predictEpidemicTrend,
  type ChronicDiseaseData,
} from '../../src/bff/aggregators/publicHealthAggregator';

describe('calculateChronicDiseaseControlRate', () => {
  it('控制率 = 受控总数/登记总数', () => {
    const data: ChronicDiseaseData = {
      hypertension: { registered: 100, controlled: 80 },
      diabetes: { registered: 100, controlled: 70 },
      coronary: { registered: 100, controlled: 60 },
      stroke: { registered: 100, controlled: 50 },
    };
    expect(calculateChronicDiseaseControlRate(data)).toBe(65);
  });

  it('空数据 → 0', () => {
    const data: ChronicDiseaseData = {
      hypertension: { registered: 0, controlled: 0 },
      diabetes: { registered: 0, controlled: 0 },
      coronary: { registered: 0, controlled: 0 },
      stroke: { registered: 0, controlled: 0 },
    };
    expect(calculateChronicDiseaseControlRate(data)).toBe(0);
  });
});

describe('predictEpidemicTrend', () => {
  it('病例上升 → up', () => {
    const r = predictEpidemicTrend([10, 10, 10, 20, 25, 30, 35, 40, 45]);
    expect(r.trend).toBe('up');
  });

  it('病例下降 → down', () => {
    const r = predictEpidemicTrend([100, 100, 100, 80, 60, 40, 30, 20, 10]);
    expect(r.trend).toBe('down');
  });

  it('数据不足 → flat', () => {
    expect(predictEpidemicTrend([10, 20]).trend).toBe('flat');
  });
});

describe('buildPublicHealthReport', () => {
  it('生成传染病统计', () => {
    const r = buildPublicHealthReport('公卫科', '30d');
    expect(r.infectiousDiseases.classB).toBeGreaterThanOrEqual(0);
  });

  it('生成慢病控制率', () => {
    const r = buildPublicHealthReport('公卫科', '30d');
    expect(r.chronicControlRate).toBeGreaterThan(0);
  });

  it('生成接种率', () => {
    const r = buildPublicHealthReport('公卫科', '30d');
    expect(r.immunization.firstClassRate).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildPublicHealthReport('公卫科', '30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
