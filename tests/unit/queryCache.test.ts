/**
 * 健澜科技 jlmedaios - BFF 查询缓存（queryCache）单测
 *
 * 验证 createCache(ttlMs) 的核心语义：
 *  - 未命中返回 undefined，set 后 get 命中；
 *  - 不同键互不干扰、同键覆盖写入；
 *  - clear 后全部条目失效；
 *  - TTL 到期后条目自动过期（懒过期），重新 set 重新计时；
 *  - 负缓存（null / 空结构）可正常驻留；
 *  - 非法 ttlMs 抛 RangeError。
 * 全部为纯函数断言，不依赖数据库与外部时钟。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import { createCache } from '../../src/bff/utils/queryCache';

/** 测试用等待（毫秒） */
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

describe('queryCache / createCache', () => {
  it('未命中返回 undefined；set 后 get 命中同一值', () => {
    const cache = createCache<string>(60_000);
    expect(cache.get('a')).toBeUndefined();

    cache.set('a', 'hello');
    expect(cache.get('a')).toBe('hello');
  });

  it('不同键互不干扰；同键重复 set 覆盖旧值', () => {
    const cache = createCache<number>(60_000);
    cache.set('x', 1);
    cache.set('y', 2);

    expect(cache.get('x')).toBe(1);
    expect(cache.get('y')).toBe(2);

    cache.set('x', 100);
    expect(cache.get('x')).toBe(100);
    expect(cache.get('y')).toBe(2);
  });

  it('clear 后全部条目失效', () => {
    const cache = createCache<number>(60_000);
    cache.set('k1', 1);
    cache.set('k2', 2);

    cache.clear();
    expect(cache.get('k1')).toBeUndefined();
    expect(cache.get('k2')).toBeUndefined();
  });

  it('TTL 到期后条目自动过期（懒过期）', async () => {
    // 极短 TTL：30ms
    const cache = createCache<string>(30);
    cache.set('role', 'doctor');

    // 写入后立刻命中
    expect(cache.get('role')).toBe('doctor');

    // 等待超过 TTL
    await sleep(60);
    expect(cache.get('role')).toBeUndefined();
  });

  it('过期后重新 set 从写入时刻重新计时 TTL', async () => {
    const cache = createCache<string>(40);
    cache.set('k', 'v1');
    expect(cache.get('k')).toBe('v1');

    await sleep(60); // 第一次写入过期
    expect(cache.get('k')).toBeUndefined();

    cache.set('k', 'v2'); // 重新计时
    expect(cache.get('k')).toBe('v2');
    await sleep(20); // 新 TTL 内
    expect(cache.get('k')).toBe('v2');
  });

  it('负缓存值（null / 空结构）可正常驻留，TTL 内不误判为未命中', () => {
    const cache = createCache<{ list: number[] } | null>(60_000);
    cache.set('empty-profile', null);
    cache.set('empty-kb', { list: [] });

    expect(cache.get('empty-profile')).toBeNull();
    expect(cache.get('empty-kb')).toEqual({ list: [] });
  });

  it('空 TTL（0）表示写入即过期', () => {
    const cache = createCache<string>(0);
    cache.set('k', 'v');
    // 到期判定 Date.now() >= expiresAt（=写入时刻），恒过期
    expect(cache.get('k')).toBeUndefined();
  });

  it('非法 ttlMs（负数 / NaN / Infinity）抛 RangeError', () => {
    expect(() => createCache(-1)).toThrow(RangeError);
    expect(() => createCache(Number.NaN)).toThrow(RangeError);
    expect(() => createCache(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});
