/**
 * rowText 安全文本化工具单元测试
 *
 * 锁定语义：string 原样；number/boolean/bigint 走 String；
 * Date 保持 String(date) 旧行为；null/undefined/对象 → ''（拒绝 [object Object]）。
 */
import { describe, expect, it } from 'bun:test';

import { toText, toTextOrNull } from '../../../src/db/rowText.js';

describe('toText', () => {
  it('string 原样返回', () => {
    expect(toText('hello')).toBe('hello');
    expect(toText('')).toBe('');
  });

  it('number/boolean/bigint 走 String()', () => {
    expect(toText(42)).toBe('42');
    expect(toText(3.14)).toBe('3.14');
    expect(toText(true)).toBe('true');
    expect(toText(10n)).toBe('10');
  });

  it('Date 保持 String(date) 旧行为', () => {
    const d = new Date('2026-01-01T00:00:00Z');
    expect(toText(d)).toBe(String(d));
  });

  it('null/undefined 返回空串', () => {
    expect(toText(null)).toBe('');
    expect(toText(undefined)).toBe('');
  });

  it('对象/数组不输出 [object Object]', () => {
    expect(toText({})).toBe('');
    expect(toText({ a: 1 })).toBe('');
    expect(toText([1, 2])).toBe('');
    expect(toText({})).not.toBe('[object Object]');
  });
});

describe('toTextOrNull', () => {
  it('null/undefined 保持 null', () => {
    expect(toTextOrNull(null)).toBeNull();
    expect(toTextOrNull(undefined)).toBeNull();
  });

  it('其余同 toText', () => {
    expect(toTextOrNull('x')).toBe('x');
    expect(toTextOrNull(1)).toBe('1');
    expect(toTextOrNull({})).toBe('');
  });
});
