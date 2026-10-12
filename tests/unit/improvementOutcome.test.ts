/**
 * 健澜科技 jlmedaios - 整改效果回看纯函数单测（M22-E）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { judgeOutcome } from '../../src/medical-tools/operations/improvementOutcome';

describe('improvement outcome judge', () => {
  it('下降>=30% effective', () => {
    expect(judgeOutcome(0.5, 0.3)).toBe('effective'); // drop=(0.5-0.3)/0.5=0.4 ≥0.3
  });
  it('下降0-30% partial', () => {
    expect(judgeOutcome(0.5, 0.4)).toBe('partial'); // drop=0.2
  });
  it('持平 no_improvement', () => {
    expect(judgeOutcome(0.5, 0.5)).toBe('no_improvement');
  });
  it('上升 worse', () => {
    expect(judgeOutcome(0.5, 0.6)).toBe('worse');
  });
});
