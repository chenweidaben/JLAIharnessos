/**
 * 健澜科技 jlmedaios - DIP 纯函数单测（M23-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { computePointValue, settleAmount } from '../../src/medical-tools/operations/dipPoint';

describe('dip point pure', () => {
  it('点值 = 基金池/总分值', () => {
    expect(computePointValue(1_000_000, 5000)).toBe(200);
  });
  it('除零保护返回 0', () => {
    expect(computePointValue(1_000_000, 0)).toBe(0);
  });
  it('结算 = 分值 × 点值', () => {
    expect(settleAmount(10, 200)).toBe(2000);
  });
});
