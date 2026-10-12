/**
 * 健澜科技 jlmedaios - 不良事件评估前端 utils 单测（M17-D）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'vitest';
import { eventTypeLabel, isFallEvent, riskLevelLabel } from '@/utils/eventReview';

describe('M17-D utils', () => {
  it('事件类型标签', () => {
    expect(eventTypeLabel('fall')).toBe('跌倒事件');
    expect(eventTypeLabel('pressure_injury_stage2')).toContain('二期');
  });
  it('是否跌倒', () => {
    expect(isFallEvent('fall')).toBe(true);
    expect(isFallEvent('pressure_injury_stage3')).toBe(false);
  });
  it('风险分级标签', () => {
    expect(riskLevelLabel('high')).toBe('高风险');
    expect(riskLevelLabel(null)).toBe('—');
  });
});
