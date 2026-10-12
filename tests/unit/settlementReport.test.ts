/**
 * 健澜科技 jlmedaios - 月度结算报表纯函数单测（M23-C）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { aggregateSummary, toCsv } from '../../src/medical-tools/operations/settlementReport';

describe('settlement report pure', () => {
  it('聚合病例数与结算总额', () => {
    const s = aggregateSummary([
      { selectedPath: 'auto_drg', drgPayment: 3000, dipPayment: 0, outOfPocket: 500 },
      { selectedPath: 'auto_dip', drgPayment: 0, dipPayment: 2000, outOfPocket: 300, dipScore: 10 },
    ], 200);
    expect(s.drgCases).toBe(1);
    expect(s.dipCases).toBe(1);
    expect(s.insuranceSettlement).toBe(5000);
    expect(s.outOfPocket).toBe(800);
    expect(s.totalScore).toBe(10);
  });
  it('CSV 含表头与行', () => {
    const csv = toCsv({ period: '2099-01', drgCases: 1, dipCases: 1, totalScore: 10, pointValue: 200, insuranceSettlement: 5000, outOfPocket: 800 });
    expect(csv).toMatch(/period,drg_cases/);
    expect(csv).toMatch(/2099-01,1,1,10,200,5000,800/);
  });
});
