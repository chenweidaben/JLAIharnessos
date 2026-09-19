/**
 * jlmedaios - 缓存层 RateLimiter 新增能力（滑动窗口 / 令牌桶）测试
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { describe, it, expect } from 'bun:test';
import { MemoryCache, RateLimiter } from '@/cache/index.js';

const tick = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('RateLimiter.slidingWindowConsume', () => {
  it('窗口内计数，超限拒绝；窗口外恢复', async () => {
    const rl = new RateLimiter(new MemoryCache());
    const rule = { limit: 3, windowMs: 120 };
    for (let i = 0; i < 3; i++) {
      const r = await rl.slidingWindowConsume('login', 'u1', rule);
      expect(r.allowed).toBe(true);
    }
    const denied = await rl.slidingWindowConsume('login', 'u1', rule);
    expect(denied.allowed).toBe(false);
    expect(denied.remaining).toBe(0);

    await tick(140);
    const again = await rl.slidingWindowConsume('login', 'u1', rule);
    expect(again.allowed).toBe(true);
  });
});

describe('RateLimiter.tokenBucketConsume', () => {
  it('突发受容量限制，按窗口补充令牌', async () => {
    const rl = new RateLimiter(new MemoryCache());
    const rule = { capacity: 3, refillTokensPerWindow: 2, windowMs: 100 };
    for (let i = 0; i < 3; i++) {
      expect((await rl.tokenBucketConsume('query', 'u2', rule)).allowed).toBe(true);
    }
    // 桶空
    expect((await rl.tokenBucketConsume('query', 'u2', rule)).allowed).toBe(false);

    // 等待一个补充周期，至少补 2 个
    await tick(120);
    expect((await rl.tokenBucketConsume('query', 'u2', rule)).allowed).toBe(true);
  });
});
