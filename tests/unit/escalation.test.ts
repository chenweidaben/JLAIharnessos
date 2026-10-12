/**
 * 健澜科技 jlmedaios - 整改升级纯函数单测（M22-F）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { nextLevel, shouldEscalate } from '../../src/medical-tools/operations/escalation';

describe('escalation pure', () => {
  it('应升级', () => {
    expect(shouldEscalate('worse')).toBe(true);
    expect(shouldEscalate('no_improvement')).toBe(true);
    expect(shouldEscalate('effective')).toBe(false);
    expect(shouldEscalate('partial')).toBe(false);
  });
  it('级别', () => {
    expect(nextLevel(1)).toBe(2);
    expect(nextLevel(2)).toBe(3);
  });
});
