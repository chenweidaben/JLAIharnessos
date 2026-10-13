/**
 * 健澜科技 jlmedaios - SBAR 纯函数测试（M73-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { canClose, isComplete, nextStatus } from '../../src/medical-tools/nursing/sbar.js';

describe('isComplete', () => {
  it('四段非空 -> true', () => {
    expect(isComplete({ situation: 's', background: 'b', assessment: 'a', recommendation: 'r' })).toBe(true);
  });
  it('缺一段 -> false', () => {
    expect(isComplete({ situation: 's', background: 'b', assessment: '', recommendation: 'r' })).toBe(false);
  });
});

describe('canClose', () => {
  it('received 且 receiver 存在 -> true', () => {
    expect(canClose('received', 'abc')).toBe(true);
  });
  it('pending -> false', () => {
    expect(canClose('pending', 'abc')).toBe(false);
  });
  it('received 但无 receiver -> false', () => {
    expect(canClose('received', null)).toBe(false);
  });
});

describe('nextStatus', () => {
  it('pending + receive -> received', () => {
    expect(nextStatus('pending', 'receive')).toBe('received');
  });
  it('received + close -> closed', () => {
    expect(nextStatus('received', 'close')).toBe('closed');
  });
  it('pending + close 非法 -> pending', () => {
    expect(nextStatus('pending', 'close')).toBe('pending');
  });
});
