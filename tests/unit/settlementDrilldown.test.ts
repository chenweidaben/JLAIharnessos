/**
 * 健澜科技 jlmedaios - 结算下钻纯函数单测（M23-E）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { byDepartment, byDoctor, type PeriodCase } from '../../src/medical-tools/operations/settlementDrilldown';

const cases: PeriodCase[] = [
  { department: 'A', doctorId: 'd1', settlement: 1000, overspend: true, drugCost: 300, totalCost: 1000 },
  { department: 'A', doctorId: 'd1', settlement: 2000, overspend: false, drugCost: 400, totalCost: 2000 },
  { department: 'B', doctorId: 'd2', settlement: 500, overspend: false, drugCost: 100, totalCost: 500 },
];

describe('settlement drilldown pure', () => {
  it('按科室聚合+降序', () => {
    const d = byDepartment(cases);
    expect(d[0].key).toBe('A');
    expect(d[0].cases).toBe(2);
    expect(d[0].settlementTotal).toBe(3000);
    expect(d[0].overspendRate).toBeCloseTo(0.5);
    expect(d[0].drugRatio).toBeCloseTo(700 / 3000);
    expect(d[1].key).toBe('B');
  });
  it('按医生聚合+排名', () => {
    const d = byDoctor(cases);
    expect(d).toHaveLength(2);
    expect(d[0].key).toBe('d1');
    expect(d[0].settlementTotal).toBe(3000);
  });
});
