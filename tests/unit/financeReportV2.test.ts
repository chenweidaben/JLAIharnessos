/**
 * 健澜科技 jlmedaios - 财务 V2 纯函数单测（M211-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessDRGProfit,
  buildFinanceReportV2,
  calculateCostRatio,
} from '../../src/bff/aggregators/financeReportV2Aggregator';

describe('calculateCostRatio', () => {
  it('成本 80000 收入 100000 → 80% 合理', () => {
    const r = calculateCostRatio(80000, 100000);
    expect(r.ratio).toBe(0.8);
    expect(r.level).toBe('合理');
  });

  it('成本 95000 收入 100000 → 95% 亏损风险', () => {
    const r = calculateCostRatio(95000, 100000);
    expect(r.level).toBe('亏损风险');
  });
});

describe('assessDRGProfit', () => {
  it('成本 8000 支付 8500 → 盈利', () => {
    const r = assessDRGProfit(8000, 8500);
    expect(r.status).toBe('盈利');
  });

  it('成本 9000 支付 8500 → 亏损', () => {
    const r = assessDRGProfit(9000, 8500);
    expect(r.status).toBe('亏损');
  });
});

describe('buildFinanceReportV2', () => {
  it('生成收入数据', () => {
    const r = buildFinanceReportV2('30d');
    expect(r.revenue.total).toBeGreaterThan(0);
  });

  it('生成DRG数据', () => {
    const r = buildFinanceReportV2('30d');
    expect(r.drgCost.avgCost).toBeGreaterThan(0);
  });

  it('生成预算数据', () => {
    const r = buildFinanceReportV2('30d');
    expect(r.budget.executionRate).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildFinanceReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
