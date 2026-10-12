/**
 * 健澜科技 jlmedaios - 压疮/跌倒风险预警前端纯函数单测（M17-A）
 *
 * 覆盖风险类型/层级/状态标签与色值、Braden/Morse 表单项字典完整性。
 * 纯函数、无 I/O、无渲染。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { describe, expect, it } from 'vitest';
import {
  BRADEN_ITEMS,
  MORSE_ITEMS,
  riskTypeLabel,
  levelLabel,
  levelColor,
  preventionStatusLabel,
} from '@/utils/nursingRisk';

describe('M17-A 风险类型/层级标签', () => {
  it('风险类型中文名', () => {
    expect(riskTypeLabel('pressure_ulcer')).toContain('Braden');
    expect(riskTypeLabel('fall')).toContain('Morse');
  });
  it('层级标签', () => {
    expect(levelLabel('high')).toBe('高危');
    expect(levelLabel('medium')).toBe('中危');
    expect(levelLabel('low')).toBe('低危');
  });
  it('层级标签色：高危红/中危橙/低危绿', () => {
    expect(levelColor('high')).toBe('red');
    expect(levelColor('medium')).toBe('orange');
    expect(levelColor('low')).toBe('green');
  });
});

describe('M17-A 预防措施状态标签', () => {
  it('四态映射', () => {
    expect(preventionStatusLabel('suggested')).toBe('待确认');
    expect(preventionStatusLabel('accepted')).toBe('已确认待执行');
    expect(preventionStatusLabel('executed')).toBe('已执行');
    expect(preventionStatusLabel('cancelled')).toBe('已取消');
  });
  it('未知状态原样返回', () => {
    expect(preventionStatusLabel('weird' as never)).toBe('weird');
  });
});

describe('M17-A 量表字典完整性', () => {
  it('Braden 6 条目、frictionShear 取值 1-3', () => {
    expect(BRADEN_ITEMS).toHaveLength(6);
    expect(BRADEN_ITEMS.every((i) => i.max >= i.min)).toBe(true);
    const fs = BRADEN_ITEMS.find((i) => i.key === 'frictionShear')!;
    expect(fs.min).toBe(1);
    expect(fs.max).toBe(3);
  });
  it('Morse 6 条目、fallHistory 固定选项 0/25', () => {
    expect(MORSE_ITEMS).toHaveLength(6);
    const fh = MORSE_ITEMS.find((i) => i.key === 'fallHistory')!;
    expect(fh.options.map((o) => o.value)).toEqual([0, 25]);
  });
});
