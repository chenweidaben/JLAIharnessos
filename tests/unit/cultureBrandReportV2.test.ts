/**
 * 健澜科技 jlmedaios - 文化品牌 V2 纯函数单测（M228-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessBrandAwareness,
  buildCultureBrandReportV2,
  buildCulturePlan,
} from '../../src/bff/aggregators/cultureBrandReportV2Aggregator';

describe('assessBrandAwareness', () => {
  it('90分 → 高', () => {
    expect(assessBrandAwareness(90).level).toBe('高');
  });

  it('70分 → 中', () => {
    expect(assessBrandAwareness(70).level).toBe('中');
  });
});

describe('buildCulturePlan', () => {
  it('5个主题 → 20个活动', () => {
    expect(buildCulturePlan(5).activities).toBe(20);
  });
});

describe('buildCultureBrandReportV2', () => {
  it('生成精神文化数据', () => {
    const r = buildCultureBrandReportV2('30d');
    expect(r.spirit.motto).toBeTruthy();
  });

  it('生成VI数据', () => {
    const r = buildCultureBrandReportV2('30d');
    expect(r.vi.newMedia).toBeGreaterThan(0);
  });

  it('生成宣传数据', () => {
    const r = buildCultureBrandReportV2('30d');
    expect(r.propaganda.articles).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildCultureBrandReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
