/**
 * 健澜科技 jlmedaios - 医保对账纯函数单测（M3-G）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import { computeLines } from '../../src/bff/aggregators/reconAggregator';
import type { FeeLine } from '../../src/db/repositories/reconRepo';

function mk(p: Partial<FeeLine>): FeeLine {
  return {
    feeItemId: p.feeItemId ?? 'f1',
    itemCode: p.itemCode ?? 'X',
    itemName: p.itemName ?? '项',
    quantity: p.quantity ?? '1',
    postedUnitPrice: p.postedUnitPrice ?? null,
    postedAmount: p.postedAmount ?? '0',
    catalogPrice: p.catalogPrice ?? null,
  };
}

describe('computeLines', () => {
  it('价格一致记 matched', () => {
    const out = computeLines([mk({ itemCode: 'C01', quantity: '2', postedAmount: '100.00', catalogPrice: '50' })]);
    expect(out.lines[0].matched).toBe(true);
    expect(out.lines[0].expectedAmount).toBe('100.00');
    expect(out.matched).toBe(1);
    expect(out.discrepancy).toBe(0);
  });

  it('价格不符记差异', () => {
    const out = computeLines([mk({ itemCode: 'C02', quantity: '1', postedAmount: '120.00', catalogPrice: '100' })]);
    expect(out.lines[0].matched).toBe(false);
    expect(out.lines[0].diff).toBe('20.00');
    expect(out.discrepancy).toBe(1);
  });

  it('目录缺项记差异并提示待核价', () => {
    const out = computeLines([mk({ itemCode: 'NONE', postedAmount: '50.00', catalogPrice: null })]);
    expect(out.lines[0].matched).toBe(false);
    expect(out.lines[0].note).toContain('目录无');
  });

  it('汇总金额正确', () => {
    const out = computeLines([
      mk({ feeItemId: 'a', postedAmount: '100.00', catalogPrice: '100' }),
      mk({ feeItemId: 'b', postedAmount: '200.00', catalogPrice: '200' }),
    ]);
    expect(out.totalPosted).toBe('300.00');
    expect(out.totalExpected).toBe('300.00');
  });
});
