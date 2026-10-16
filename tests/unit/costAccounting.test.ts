/**
 * 健澜科技 jlmedaios - 成本核算纯函数单测（M189-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildCostAccountingReport,
  calculateDeptCost,
  calculateDiseaseCost,
  type DeptCostData,
  type DiseaseCostData,
} from '../../src/bff/aggregators/costAccountingAggregator';

describe('calculateDeptCost', () => {
  it('各项之和 = 总成本', () => {
    const data: DeptCostData = { personnel: 100, drugs: 200, consumables: 50, depreciation: 30, overhead: 40 };
    expect(calculateDeptCost(data)).toBe(420);
  });
});

describe('calculateDiseaseCost', () => {
  it('各项之和 = 病种成本', () => {
    const data: DiseaseCostData = { drugCost: 100, consumableCost: 50, bedCost: 30, laborCost: 20 };
    expect(calculateDiseaseCost(data)).toBe(200);
  });
});

describe('buildCostAccountingReport', () => {
  it('总成本 = 各项之和', () => {
    const r = buildCostAccountingReport('心内科', '30d');
    const expected = calculateDeptCost(r.costStructure);
    expect(r.deptTotalCost).toBe(expected);
  });

  it('控制率 = 实际/预算', () => {
    const r = buildCostAccountingReport('心内科', '30d');
    const expected = Math.round((r.deptTotalCost / r.budget) * 1000) / 10;
    expect(r.costControlRate).toBe(expected);
  });

  it('生成病种成本列表', () => {
    const r = buildCostAccountingReport('心内科', '30d');
    expect(r.diseaseCosts.length).toBeGreaterThan(0);
  });

  it('生成优化建议', () => {
    const r = buildCostAccountingReport('心内科', '30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
