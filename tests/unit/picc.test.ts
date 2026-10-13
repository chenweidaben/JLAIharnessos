/**
 * 健澜科技 jlmedaios - PICC 维护纯函数测试（M68-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { complicationSeverity, dueForMaintenance, needsAlert } from '../../src/medical-tools/nursing/picc.js';

describe('dueForMaintenance', () => {
  it('超过 7 天 -> true', () => {
    expect(dueForMaintenance('2026-10-01', '2026-10-10')).toBe(true);
  });
  it('3 天 -> false', () => {
    expect(dueForMaintenance('2026-10-07', '2026-10-10')).toBe(false);
  });
});

describe('complicationSeverity', () => {
  it('thrombosis -> high', () => {
    expect(complicationSeverity('thrombosis')).toBe('high');
  });
  it('none -> low', () => {
    expect(complicationSeverity('none')).toBe('low');
  });
});

describe('needsAlert', () => {
  it('infection -> true', () => {
    expect(needsAlert('infection')).toBe(true);
  });
  it('none -> false', () => {
    expect(needsAlert('none')).toBe(false);
  });
});
