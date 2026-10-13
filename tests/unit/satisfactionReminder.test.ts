/**
 * 健澜科技 jlmedaios - 满意度提醒 stage 纯函数测试（M64-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { dueStage } from '../../src/medical-tools/nursing/satisfactionReminder.js';

describe('dueStage', () => {
  it('已填 -> done', () => {
    expect(dueStage(5, true)).toBe('done');
  });
  it('出院 3-6 天 -> first', () => {
    expect(dueStage(3, false)).toBe('first');
    expect(dueStage(6, false)).toBe('first');
  });
  it('出院 >=7 天 -> second', () => {
    expect(dueStage(7, false)).toBe('second');
  });
  it('<3 天 -> none', () => {
    expect(dueStage(2, false)).toBe('none');
  });
});
