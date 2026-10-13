/**
 * 健澜科技 jlmedaios - 营养科会诊纯函数测试（M58-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { followupDue, needsFollowup, planTier } from '../../src/medical-tools/nursing/nutritionConsult.js';

describe('nutritionConsult planTier', () => {
  it('<1500 low', () => { expect(planTier(1200)).toBe('low'); });
  it('1500~2500 normal', () => { expect(planTier(2000)).toBe('normal'); });
  it('>2500 high', () => { expect(planTier(2800)).toBe('high'); });
});

describe('nutritionConsult followup', () => {
  it('到期返回 true', () => {
    expect(followupDue('2026-10-01T00:00:00Z', 7, '2026-10-09T00:00:00Z')).toBe(true);
  });
  it('未到期返回 false', () => {
    expect(followupDue('2026-10-01T00:00:00Z', 7, '2026-10-03T00:00:00Z')).toBe(false);
  });
  it('consulted 且到期 -> needsFollowup', () => {
    expect(needsFollowup('consulted', '2026-10-01T00:00:00Z', 7, '2026-10-09T00:00:00Z')).toBe(true);
  });
  it('已随访不提醒', () => {
    expect(needsFollowup('followed_up', '2026-10-01T00:00:00Z', 7, '2026-10-09T00:00:00Z')).toBe(false);
  });
});
