/**
 * 健澜科技 jlmedaios - 结算分析纯函数单测（M23-D）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { buildAnalytics, pctChange, ratioShare, trendOf } from '../../src/medical-tools/operations/settlementAnalytics';

describe('settlement analytics pure', () => {
  it('pctChange', () => {
    expect(pctChange(110, 100)).toBeCloseTo(0.1);
    expect(pctChange(100, 0)).toBeNull();
  });
  it('trendOf ±3%', () => {
    expect(trendOf(0.1)).toBe('up');
    expect(trendOf(-0.1)).toBe('down');
    expect(trendOf(0.01)).toBe('flat');
    expect(trendOf(null)).toBe('na');
  });
  it('ratioShare', () => {
    expect(ratioShare(3, 4)).toBeCloseTo(0.75);
    expect(ratioShare(3, 0)).toBe(0);
  });
  it('buildAnalytics 12期序列含环比/占比', () => {
    const pts = [
      { period: '2099-01', insuranceSettlement: 100, drgCases: 3, dipCases: 1, drugShare: 0.3, materialShare: 0.1, examShare: 0.2 },
      { period: '2099-02', insuranceSettlement: 110, drgCases: 4, dipCases: 1, drugShare: 0.3, materialShare: 0.1, examShare: 0.2 },
    ];
    const a = buildAnalytics(pts);
    expect(a[0].settlementMoM).toBeNull();
    expect(a[1].settlementMoM).toBeCloseTo(0.1);
    expect(a[1].drgRatio).toBeCloseTo(0.8);
  });
});
