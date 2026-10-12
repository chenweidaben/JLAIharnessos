/**
 * 健澜科技 jlmedaios - 出入量前端 utils 单测（M17-E）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'vitest';
import { balanceColor, categoryLabel, shiftLabel } from '@/utils/nursingIo';

describe('M17-E utils', () => {
  it('分类标签', () => {
    expect(categoryLabel('oral')).toBe('口服');
    expect(categoryLabel('urine')).toBe('尿液');
  });
  it('班次标签', () => {
    expect(shiftLabel('day')).toContain('白班');
    expect(shiftLabel('night')).toContain('大夜');
  });
  it('平衡色', () => {
    expect(balanceColor(600)).toBe('red');
    expect(balanceColor(0)).toBe('green');
  });
});
