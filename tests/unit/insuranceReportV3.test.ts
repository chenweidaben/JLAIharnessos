/**
 * 健澜科技 jlmedaios - 医保 V3 纯函数单测（M205-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessCostStructure,
  buildInsuranceReportV3,
  calculateDRGWeight,
  type CostBill,
  type DRGGroup,
} from '../../src/bff/aggregators/insuranceReportV3Aggregator';

describe('calculateDRGWeight', () => {
  it('成本低于均值 → 盈利', () => {
    const g: DRGGroup = { mdc: 'MDC1', adrg: 'ADRG1', cost: 8000, avgCost: 10000 };
    const r = calculateDRGWeight(g);
    expect(r.profit).toBe(2000);
    expect(r.loss).toBe(false);
  });

  it('成本超均值 → 亏损', () => {
    const g: DRGGroup = { mdc: 'MDC1', adrg: 'ADRG1', cost: 12000, avgCost: 10000 };
    const r = calculateDRGWeight(g);
    expect(r.loss).toBe(true);
  });
});

describe('assessCostStructure', () => {
  it('药占比低 → 合理', () => {
    const bill: CostBill = { total: 10000, drugCost: 2000, materialCost: 1500, selfPay: 1000 };
    const r = assessCostStructure(bill);
    expect(r.reasonable).toBe(true);
  });

  it('药占比高 → 不合理', () => {
    const bill: CostBill = { total: 10000, drugCost: 5000, materialCost: 1500, selfPay: 3000 };
    const r = assessCostStructure(bill);
    expect(r.reasonable).toBe(false);
  });
});

describe('buildInsuranceReportV3', () => {
  it('生成DRG数据', () => {
    const r = buildInsuranceReportV3('30d');
    expect(r.drg.groupingRate).toBeGreaterThan(0);
  });

  it('生成DIP数据', () => {
    const r = buildInsuranceReportV3('30d');
    expect(r.dip.totalBudget).toBeGreaterThan(0);
  });

  it('生成费用数据', () => {
    const r = buildInsuranceReportV3('30d');
    expect(r.cost.avgPerVisit).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildInsuranceReportV3('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
