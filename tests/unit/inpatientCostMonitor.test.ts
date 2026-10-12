/**
 * 健澜科技 jlmedaios - 在院费用监控纯函数单测（M22-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { levelOf, needsDischargeReview } from '../../src/medical-tools/operations/inpatientCostMonitor';

describe('inpatient cost monitor pure', () => {
  it('level 三档', () => {
    expect(levelOf(1.05, 1.1)).toBe('ok');
    expect(levelOf(1.12, 1.1)).toBe('warn');
    expect(levelOf(1.30, 1.1)).toBe('over');
    expect(levelOf(null, 1.1)).toBe('ok');
  });
  it('出院提醒', () => {
    expect(needsDischargeReview('over', false)).toBe(true);
    expect(needsDischargeReview('over', true)).toBe(false);
    expect(needsDischargeReview('ok', false)).toBe(false);
  });
});
