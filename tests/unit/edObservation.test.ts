/**
 * 健澜科技 jlmedaios - 急诊留观纯函数测试（M74-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { durationHours, isOverstay, needsAlert } from '../../src/medical-tools/nursing/edObservation.js';

describe('durationHours', () => {
  it('已出院时长正确', () => {
    const entered = new Date('2026-01-01T00:00:00Z');
    const discharged = new Date('2026-01-01T05:00:00Z');
    expect(durationHours(entered, discharged)).toBe(5);
  });
});

describe('isOverstay', () => {
  it('>24h -> true', () => {
    expect(isOverstay(25)).toBe(true);
  });
  it('<=24h -> false', () => {
    expect(isOverstay(20)).toBe(false);
  });
});

describe('needsAlert', () => {
  it('observing 且 >24h -> true', () => {
    expect(needsAlert(30, 'observing')).toBe(true);
  });
  it('closed 即使 >24h -> false', () => {
    expect(needsAlert(30, 'closed')).toBe(false);
  });
  it('observing 但 <24h -> false', () => {
    expect(needsAlert(10, 'observing')).toBe(false);
  });
});
