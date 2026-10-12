/**
 * 健澜科技 jlmedaios - 医嘱开方 CDS 纯函数单测（M18-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { evaluateCds, hasHardBlock } from '../../src/medical-tools/order/cdsRules';

describe('cdsRules allergy hard', () => {
  it('过敏命中 hard', () => {
    const alerts = evaluateCds({ drugName: 'paracetamol', doseMg: 500, frequencyPerDay: 4 }, ['Paracetamol'], []);
    expect(alerts.some((a) => a.ruleCode === 'allergy' && a.severity === 'hard')).toBe(true);
    expect(hasHardBlock(alerts)).toBe(true);
  });
  it('不过敏无 hard', () => {
    const alerts = evaluateCds({ drugName: 'metoprolol', doseMg: 50, frequencyPerDay: 2 }, ['penicillin'], []);
    expect(alerts.some((a) => a.ruleCode === 'allergy')).toBe(false);
  });
});

describe('cdsRules duplicate warn', () => {
  it('同药活跃医嘱 warn', () => {
    const alerts = evaluateCds({ drugName: 'amoxicillin', doseMg: 500, frequencyPerDay: 3 }, [], [{ drugName: 'amoxicillin', status: 'active' }]);
    expect(alerts.some((a) => a.ruleCode === 'duplicate_active_order' && a.severity === 'warn')).toBe(true);
  });
});

describe('cdsRules dose_range info', () => {
  it('超参考范围 info', () => {
    const alerts = evaluateCds({ drugName: 'paracetamol', doseMg: 2000, frequencyPerDay: 4 }, [], []);
    expect(alerts.some((a) => a.ruleCode === 'dose_range' && a.severity === 'info')).toBe(true);
  });
  it('正常范围无 dose', () => {
    const alerts = evaluateCds({ drugName: 'paracetamol', doseMg: 500, frequencyPerDay: 4 }, [], []);
    expect(alerts.some((a) => a.ruleCode === 'dose_range')).toBe(false);
  });
});

describe('cdsRules frequent warn', () => {
  it('频次过频 warn', () => {
    const alerts = evaluateCds({ drugName: 'other_drug', doseMg: 1, frequencyPerDay: 8 }, [], []);
    expect(alerts.some((a) => a.ruleCode === 'frequent_dose' && a.severity === 'warn')).toBe(true);
  });
});
