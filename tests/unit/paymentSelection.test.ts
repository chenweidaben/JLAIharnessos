/**
 * 健澜科技 jlmedaios - 病组选择纯函数单测（M23-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { buildRationale, chooseBetter } from '../../src/medical-tools/operations/paymentSelection';

describe('payment selection pure', () => {
  it('DRG 更高选 auto_drg', () => {
    expect(chooseBetter(3000, 2000)).toBe('auto_drg');
  });
  it('DIP 更高选 auto_dip', () => {
    expect(chooseBetter(2000, 3000)).toBe('auto_dip');
  });
  it('相等默认 drg', () => {
    expect(chooseBetter(2000, 2000)).toBe('auto_drg');
  });
  it('rationale', () => {
    expect(buildRationale(2000, 3000, 'auto_dip')).toMatch(/auto_dip/);
  });
});
