/**
 * 健澜科技 jlmedaios - 号源配额纯函数单测（M19-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { afterBookValidates, isAvailable, remainingQuota } from '../../src/medical-tools/internet/slotQuota';

describe('slotQuota pure', () => {
  it('剩余号', () => {
    expect(remainingQuota({ totalQuota: 10, bookedCount: 3, status: 'open' })).toBe(7);
    expect(remainingQuota({ totalQuota: 5, bookedCount: 5, status: 'open' })).toBe(0);
  });
  it('可约', () => {
    expect(isAvailable({ totalQuota: 5, bookedCount: 0, status: 'open' })).toBe(true);
    expect(isAvailable({ totalQuota: 5, bookedCount: 5, status: 'open' })).toBe(false);
    expect(isAvailable({ totalQuota: 5, bookedCount: 0, status: 'closed' })).toBe(false);
  });
  it('扣减后合法', () => {
    expect(afterBookValidates(5, 5)).toBe(true);
    expect(afterBookValidates(5, 6)).toBe(false);
  });
});
