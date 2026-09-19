/**
 * jlmedaios - 分级多维限流器测试
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { describe, it, expect } from 'bun:test';
import { TieredRateLimiter, assertAllowed } from '@/resilience/RateLimiter.js';
import { ResilienceErrorCodes } from '@/resilience/CircuitBreaker.js';
import { MedicalAgentError } from '@/core/errors/index.js';

describe('TieredRateLimiter 滑动窗口', () => {
  it('窗口内超限拒绝，窗口外恢复', () => {
    let now = 0;
    const lim = new TieredRateLimiter(() => now);
    lim.registerTier('login', { algorithm: 'sliding-window', limit: 3, windowMs: 1000 });

    const key = 'T001:login:u1';
    expect(lim.consume(key, 'login').allowed).toBe(true);
    expect(lim.consume(key, 'login').allowed).toBe(true);
    expect(lim.consume(key, 'login').allowed).toBe(true);
    // 第 4 次被拒
    const denied = lim.consume(key, 'login');
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterMs).toBeGreaterThan(0);

    // 窗口推进后恢复
    now = 1001;
    expect(lim.consume(key, 'login').allowed).toBe(true);
  });

  it('不同 key 互不影响', () => {
    const lim = new TieredRateLimiter(() => 0);
    lim.registerTier('q', { algorithm: 'sliding-window', limit: 1, windowMs: 1000 });
    expect(lim.consume('a', 'q').allowed).toBe(true);
    expect(lim.consume('a', 'q').allowed).toBe(false);
    expect(lim.consume('b', 'q').allowed).toBe(true);
  });
});

describe('TieredRateLimiter 令牌桶', () => {
  it('允许突发到容量，耗尽后拒绝，按时间补充', () => {
    let now = 0;
    const lim = new TieredRateLimiter(() => now);
    // 容量 5，每 100ms 补充 1 个
    lim.registerTier('query', {
      algorithm: 'token-bucket',
      limit: 5,
      refillPerMs: 1 / 100,
    });
    const key = 'T001:query:u9';
    for (let i = 0; i < 5; i++) expect(lim.consume(key, 'query').allowed).toBe(true);
    // 第 6 次被拒（桶空）
    expect(lim.consume(key, 'query').allowed).toBe(false);

    // 推进 150ms -> 补充 1.5 个令牌 -> 可放行 1 次
    now = 150;
    expect(lim.consume(key, 'query').allowed).toBe(true);
    expect(lim.consume(key, 'query').allowed).toBe(false);
  });
});

describe('TieredRateLimiter 分级与工具', () => {
  it('assertAllowed 拒绝时抛受控错误', () => {
    const lim = new TieredRateLimiter(() => 0);
    lim.registerTier('strict', { algorithm: 'sliding-window', limit: 1, windowMs: 1000 });
    lim.consume('k', 'strict');
    const d = lim.consume('k', 'strict');
    expect(d.allowed).toBe(false);
    expect(() => assertAllowed(d, 'login')).toThrow(MedicalAgentError);
    try {
      assertAllowed(d, 'login');
    } catch (e) {
      expect((e as MedicalAgentError).code).toBe(ResilienceErrorCodes.RATE_LIMITED);
    }
  });

  it('未注册档位/算法校验报错', () => {
    const lim = new TieredRateLimiter();
    expect(() => lim.consume('k', 'nope')).toThrow(MedicalAgentError);
    expect(() =>
      lim.registerTier('bad', { algorithm: 'sliding-window', limit: 1 } as never),
    ).toThrow(MedicalAgentError);
  });

  it('reset 清空 key 状态', () => {
    const lim = new TieredRateLimiter(() => 0);
    lim.registerTier('q', { algorithm: 'sliding-window', limit: 1, windowMs: 1000 });
    lim.consume('k', 'q');
    expect(lim.consume('k', 'q').allowed).toBe(false);
    lim.reset('k');
    expect(lim.consume('k', 'q').allowed).toBe(true);
  });
});
