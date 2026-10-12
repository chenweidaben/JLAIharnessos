/**
 * 健澜科技 jlmedaios - 事中监控预算基准纯函数单测（M23-F）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { resolveBudgetBasis } from '../../src/medical-tools/operations/monitorBudgetBasis';

describe('monitor budget basis pure', () => {
  it('DIP 落组 → 预算=score×pointValue', () => {
    const r = resolveBudgetBasis({ selectedPath: 'auto_dip', drgExpectedPayment: 1000, dipScore: 10, dipPointValue: 200 });
    expect(r.basis).toBe('dip');
    expect(r.budget).toBe(2000);
  });
  it('DRG 落组 → drg 预算', () => {
    const r = resolveBudgetBasis({ selectedPath: 'auto_drg', drgExpectedPayment: 3000, dipScore: 10, dipPointValue: 200 });
    expect(r.basis).toBe('drg');
    expect(r.budget).toBe(3000);
  });
  it('null selection → 默认 drg', () => {
    const r = resolveBudgetBasis(null);
    expect(r.basis).toBe('drg');
    expect(r.budget).toBe(0);
  });
});
