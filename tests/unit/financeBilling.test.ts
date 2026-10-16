/**
 * 健澜科技 jlmedaios - 财务收费管理纯函数单测（M192-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildFinanceBillingReport,
  calculateRevenueStructure,
  predictFinancialTrend,
  type RevenueData,
} from '../../src/bff/aggregators/financeBillingAggregator';

describe('calculateRevenueStructure', () => {
  it('总收入 = 门诊 + 住院', () => {
    const data: RevenueData = {
      outpatient: { registration: 100, consultation: 100, exam: 100, treatment: 100, drug: 100, material: 100 },
      inpatient: { bed: 100, nursing: 100, surgery: 100, anesthesia: 100, drug: 100, material: 100 },
      insurance: { pooling: 0, personal: 0, selfPay: 0, selfExpense: 0, seriousIllness: 0 },
    };
    expect(calculateRevenueStructure(data).total).toBe(1200);
  });

  it('门诊占比 + 住院占比 = 100', () => {
    const data: RevenueData = {
      outpatient: { registration: 100, consultation: 0, exam: 0, treatment: 0, drug: 0, material: 0 },
      inpatient: { bed: 100, nursing: 0, surgery: 0, anesthesia: 0, drug: 0, material: 0 },
      insurance: { pooling: 0, personal: 0, selfPay: 0, selfExpense: 0, seriousIllness: 0 },
    };
    const r = calculateRevenueStructure(data);
    expect(r.outpatientRatio + r.inpatientRatio).toBe(100);
  });
});

describe('predictFinancialTrend', () => {
  it('收入上升 → 环比为正', () => {
    const r = predictFinancialTrend([100, 110, 121]);
    expect(r.mom).toBeGreaterThan(0);
  });

  it('预测 = 最近值 * (1 + 环比)', () => {
    const r = predictFinancialTrend([100, 110]);
    expect(r.forecast).toBe(121);
  });

  it('空列表 → 0', () => {
    expect(predictFinancialTrend([]).mom).toBe(0);
  });
});

describe('buildFinanceBillingReport', () => {
  it('生成收入结构', () => {
    const r = buildFinanceBillingReport('财务处', '30d');
    expect(r.revenueStructure.total).toBeGreaterThan(0);
  });

  it('生成医保结算', () => {
    const r = buildFinanceBillingReport('财务处', '30d');
    expect(r.insuranceSettlement.pooling).toBeGreaterThan(0);
  });

  it('生成欠费', () => {
    const r = buildFinanceBillingReport('财务处', '30d');
    expect(r.arrears.total).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildFinanceBillingReport('财务处', '30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
