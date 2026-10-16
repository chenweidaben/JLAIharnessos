/**
 * 健澜科技 jlmedaios - 财务核算 V2 纯函数单测（M226-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessFinancialRatio,
  buildFinanceMgmtReportV2,
  calculateCostAllocation,
} from '../../src/bff/aggregators/financeMgmtReportV2Aggregator';

describe('calculateCostAllocation', () => {
  it('总成本1000 基数[3,7] → 分摊[300,700]', () => {
    const r = calculateCostAllocation(1000, [3, 7]);
    expect(r.allocated[0]).toBe(300);
    expect(r.allocated[1]).toBe(700);
  });
});

describe('assessFinancialRatio', () => {
  it('资产8亿 负债3亿 → 37.5% 健康', () => {
    expect(assessFinancialRatio(800000000, 300000000).healthy).toBe(true);
  });

  it('资产8亿 负债5亿 → 62.5% 不健康', () => {
    expect(assessFinancialRatio(800000000, 500000000).healthy).toBe(false);
  });
});

describe('buildFinanceMgmtReportV2', () => {
  it('生成收入数据', () => {
    const r = buildFinanceMgmtReportV2('30d');
    expect(r.revenue.total).toBeGreaterThan(0);
  });

  it('生成成本数据', () => {
    const r = buildFinanceMgmtReportV2('30d');
    expect(r.cost.allocated).toBeGreaterThan(0);
  });

  it('生成资产数据', () => {
    const r = buildFinanceMgmtReportV2('30d');
    expect(r.asset.total).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildFinanceMgmtReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
