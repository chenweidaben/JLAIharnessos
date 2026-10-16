/**
 * 健澜科技 jlmedaios - DRG/DIP V2 纯函数单测（M230-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessCMI,
  buildDRGDIPReportV2,
  calculateDRGProfit,
} from '../../src/bff/aggregators/drgDIPReportV2Aggregator';

describe('calculateDRGProfit', () => {
  it('成本8000 支付10000 → 盈余2000', () => {
    expect(calculateDRGProfit('DRG01', 8000, 10000).status).toBe('盈余');
  });

  it('成本10000 支付8000 → 亏损-2000', () => {
    expect(calculateDRGProfit('DRG02', 10000, 8000).status).toBe('亏损');
  });
});

describe('assessCMI', () => {
  it('100病例 120权重 → CMI 1.2 高', () => {
    expect(assessCMI(100, 120).level).toBe('高');
  });

  it('100病例 70权重 → CMI 0.7 低', () => {
    expect(assessCMI(100, 70).level).toBe('低');
  });
});

describe('buildDRGDIPReportV2', () => {
  it('生成DRG数据', () => {
    const r = buildDRGDIPReportV2('30d');
    expect(r.drg.groups).toBeGreaterThan(0);
  });

  it('生成DIP数据', () => {
    const r = buildDRGDIPReportV2('30d');
    expect(r.dip.points).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildDRGDIPReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
