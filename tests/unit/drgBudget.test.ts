/**
 * 健澜科技 jlmedaios - DRG 预算纯函数单测（M22-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { classifyLevel, needsAlert, ratio } from '../../src/medical-tools/operations/drgBudget';

describe('drgBudget pure', () => {
  it('ratio', () => {
    expect(ratio(110, 100)).toBeCloseTo(1.1);
    expect(ratio(100, 0)).toBe(0);
  });
  it('level 判定', () => {
    expect(classifyLevel(105, 100, 1.1)).toBeNull(); // 1.05 < 1.1
    expect(classifyLevel(112, 100, 1.1)).toBe('warn'); // 1.12 >= 1.1, < 1.265
    expect(classifyLevel(130, 100, 1.1)).toBe('over'); // 1.30 >= 1.265
  });
  it('needsAlert', () => {
    expect(needsAlert(130, 100, 1.1)).toBe(true);
    expect(needsAlert(105, 100, 1.1)).toBe(false);
  });
});
