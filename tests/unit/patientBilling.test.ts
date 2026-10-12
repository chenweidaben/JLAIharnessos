/**
 * 健澜科技 jlmedaios - 患者端住院费用引擎纯函数测试（M50-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildCostBreakdown,
  depositBalance,
  estimateInsuranceSettlement,
} from '../../src/medical-tools/nursing/patientBilling.js';

describe('depositBalance 押金余额', () => {
  it('余额 = 已缴 − 已产生费用', () => {
    expect(depositBalance(1000, 400)).toBe(600);
  });
  it('欠费为负', () => {
    expect(depositBalance(100, 400)).toBe(-300);
  });
  it('非数字入参按 0', () => {
    expect(depositBalance(NaN as unknown as number, undefined as unknown as number)).toBe(0);
  });
});

describe('estimateInsuranceSettlement 医保预估', () => {
  it('患者自付 = 总额 × (1 − 比例)', () => {
    const r = estimateInsuranceSettlement(1000, 0.6);
    expect(r.patientOutOfPocket).toBe(400);
    expect(r.estimatedInsurancePaid).toBe(600);
    expect(r.rate).toBe(0.6);
  });
  it('比例裁剪到 [0,1]', () => {
    const r = estimateInsuranceSettlement(1000, 1.5);
    expect(r.patientOutOfPocket).toBe(0);
    expect(r.estimatedInsurancePaid).toBe(1000);
  });
  it('总额为 0 时预估全 0', () => {
    const r = estimateInsuranceSettlement(0, 0.6);
    expect(r.patientOutOfPocket).toBe(0);
    expect(r.estimatedInsurancePaid).toBe(0);
  });
});

describe('buildCostBreakdown 分类汇总', () => {
  it('按药品/检查/治疗/材料归类求和', () => {
    const b = buildCostBreakdown([
      { category: 'drug', amount: 100 },
      { category: 'lab', amount: 50 },
      { category: 'imaging', amount: 30 },
      { category: 'treatment', amount: 80 },
      { category: 'material', amount: 20 },
      { category: 'nursing', amount: 10 },
    ]);
    expect(b.byCategory.drug).toBe(100);
    expect(b.byCategory.exam).toBe(80);
    expect(b.byCategory.treatment).toBe(90);
    expect(b.byCategory.material).toBe(20);
    expect(b.total).toBe(290);
  });
  it('忽略负值/非数字', () => {
    const b = buildCostBreakdown([{ category: 'drug', amount: -5 }, { category: 'drug', amount: NaN }]);
    expect(b.byCategory.drug).toBe(0);
    expect(b.total).toBe(0);
  });
});
