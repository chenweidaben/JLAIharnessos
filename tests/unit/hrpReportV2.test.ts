/**
 * 健澜科技 jlmedaios - HRP V2 纯函数单测（M211-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessBudgetExecution,
  buildHRPReportV2,
  calculateAssetTurnover,
} from '../../src/bff/aggregators/hrpReportV2Aggregator';

describe('calculateAssetTurnover', () => {
  it('资产 50000 收入 100000 → 2.0 高效', () => {
    const r = calculateAssetTurnover(50000, 100000);
    expect(r.turnover).toBe(2);
    expect(r.level).toBe('高效');
  });

  it('资产 100000 收入 30000 → 0.3 偏低', () => {
    const r = calculateAssetTurnover(100000, 30000);
    expect(r.level).toBe('偏低');
  });
});

describe('assessBudgetExecution', () => {
  it('预算 100 实际 95 → 95% 正常', () => {
    const r = assessBudgetExecution(100, 95);
    expect(r.executionRate).toBe(0.95);
    expect(r.status).toBe('正常');
  });

  it('预算 100 实际 120 → 120% 超预算', () => {
    const r = assessBudgetExecution(100, 120);
    expect(r.status).toBe('超预算');
  });
});

describe('buildHRPReportV2', () => {
  it('生成物流数据', () => {
    const r = buildHRPReportV2('30d');
    expect(r.logistics.stockValue).toBeGreaterThan(0);
  });

  it('生成财务数据', () => {
    const r = buildHRPReportV2('30d');
    expect(r.finance.revenue).toBeGreaterThan(0);
  });

  it('生成决策数据', () => {
    const r = buildHRPReportV2('30d');
    expect(r.decision.assetTurnover).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildHRPReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
