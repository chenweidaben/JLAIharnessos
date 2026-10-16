/**
 * 健澜科技 jlmedaios - 物价收费 V2 纯函数单测（M226-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessPriceCompliance,
  buildPricingReportV2,
  calculateAverageCost,
} from '../../src/bff/aggregators/pricingReportV2Aggregator';

describe('assessPriceCompliance', () => {
  it('3000项 2970合规 → 99% 合规', () => {
    expect(assessPriceCompliance(3000, 2970).compliant).toBe(true);
  });

  it('3000项 2900合规 → 96.7% 不合规', () => {
    expect(assessPriceCompliance(3000, 2900).compliant).toBe(false);
  });
});

describe('calculateAverageCost', () => {
  it('50000就诊 总收入1亿 → 均次2000', () => {
    expect(calculateAverageCost(50000, 100000000).average).toBe(2000);
  });
});

describe('buildPricingReportV2', () => {
  it('生成服务项目数据', () => {
    const r = buildPricingReportV2('30d');
    expect(r.service.items).toBeGreaterThan(0);
  });

  it('生成耗材数据', () => {
    const r = buildPricingReportV2('30d');
    expect(r.consumable.spd).toBeGreaterThan(0);
  });

  it('生成收入数据', () => {
    const r = buildPricingReportV2('30d');
    expect(r.revenue.total).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildPricingReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
