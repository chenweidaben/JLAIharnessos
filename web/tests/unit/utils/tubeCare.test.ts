/**
 * 健澜科技 jlmedaios - 管路护理前端 utils 单测（M17-C）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'vitest';
import {
  isHighRiskTube, removalTypeLabel, tubeStatusLabel, tubeTypeLabel,
} from '@/utils/tubeCare';

describe('M17-C utils', () => {
  it('高危管路', () => {
    expect(isHighRiskTube('cvc')).toBe(true);
    expect(isHighRiskTube('arterial_line')).toBe(true);
    expect(isHighRiskTube('urinary_catheter')).toBe(false);
  });
  it('标签', () => {
    expect(tubeTypeLabel('cvc')).toContain('CVC');
    expect(tubeStatusLabel('in_place')).toBe('在管');
    expect(removalTypeLabel('planned')).toBe('计划拔管');
    expect(removalTypeLabel('unplanned')).toBe('非计划拔管');
    expect(removalTypeLabel(null)).toBe('—');
  });
});
