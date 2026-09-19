/**
 * 健澜科技杠OS - 限流器
 *
 * 固定窗口计数（底层 incrAndExpire 原子自增 + 首次设过期），
 * 适用于 API 限流、智能体调用配额、登录失败锁定等。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 */

import type { ICache } from './types.js';
import { cacheKey } from './types.js';

export interface RateLimitResult {
  allowed: boolean;
  /** 本窗口已用次数 */
  count: number;
  /** 剩余可用次数 */
  remaining: number;
  /** 窗口重置剩余毫秒 */
  resetMs: number;
  limit: number;
}

export interface RateLimitRule {
  /** 窗口内最大次数 */
  limit: number;
  /** 窗口大小（毫秒） */
  windowMs: number;
}

export class RateLimiter {
  constructor(private readonly cache: ICache) {}

  /**
   * 消耗一次配额。
   * @param scope 限流域，如 api、agent-invoke、login-fail
   * @param identity 限流对象（用户ID/IP/智能体ID）
   */
  async consume(scope: string, identity: string, rule: RateLimitRule): Promise<RateLimitResult> {
    const key = cacheKey('ratelimit', scope, identity);
    const count = await this.cache.incrAndExpire(key, rule.windowMs, 1);
    const ttl = await this.cache.ttl(key);
    const resetMs = ttl > 0 ? ttl : rule.windowMs;
    const allowed = count <= rule.limit;
    return {
      allowed,
      count,
      remaining: Math.max(0, rule.limit - count),
      resetMs,
      limit: rule.limit,
    };
  }

  /** 仅查询不消耗（当前计数） */
  async peek(scope: string, identity: string, windowMs: number): Promise<number> {
    const key = cacheKey('ratelimit', scope, identity);
    const v = await this.cache.get<number>(key);
    return v ?? 0;
  }

  /** 重置（如登录成功后清空失败计数） */
  async reset(scope: string, identity: string): Promise<void> {
    await this.cache.del(cacheKey('ratelimit', scope, identity));
  }

  // ------------------------------------------------------------------
  // 以下为第二阶段（jlmedaios 高并发）新增的"加法"能力，向后兼容，
  // 不改动上方既有固定窗口方法与导出签名。
  // ------------------------------------------------------------------

  /**
   * 滑动窗口限流（精确，适合登录失败锁定等敏感场景）。
   * 记录最近 windowMs 内的请求时间戳，剔除过期后计数。
   * 注：基于 get/set 的非严格原子操作，适合单机/低并发精度要求场景；
   *     跨实例强一致场景请用固定窗口 incrAndExpire。
   */
  async slidingWindowConsume(
    scope: string,
    identity: string,
    rule: RateLimitRule,
  ): Promise<RateLimitResult> {
    const key = cacheKey('ratelimit', 'sliding', scope, identity);
    const now = Date.now();
    const cutoff = now - rule.windowMs;
    const raw = await this.cache.get<number[]>(key);
    const hits = (raw ?? []).filter((t) => t >= cutoff);
    hits.push(now);
    // 窗口结束前持续有效；多写一次保证 TTL
    await this.cache.set(key, hits, rule.windowMs);
    const count = hits.length;
    const allowed = count <= rule.limit;
    return {
      allowed,
      count,
      remaining: Math.max(0, rule.limit - count),
      resetMs: rule.windowMs,
      limit: rule.limit,
    };
  }

  /**
   * 令牌桶限流（允许突发，适合查询/检索类接口平滑限流）。
   * 惰性按时间补充令牌；桶内无令牌时拒绝。
   */
  async tokenBucketConsume(
    scope: string,
    identity: string,
    rule: TokenBucketRule,
  ): Promise<RateLimitResult> {
    const key = cacheKey('ratelimit', 'bucket', scope, identity);
    const now = Date.now();
    const raw = await this.cache.get<{ tokens: number; lastRefill: number }>(key);
    const state = raw ?? { tokens: rule.capacity, lastRefill: now };
    const elapsed = now - state.lastRefill;
    const refill = (elapsed / rule.windowMs) * rule.refillTokensPerWindow;
    state.tokens = Math.min(rule.capacity, state.tokens + refill);
    state.lastRefill = now;

    let allowed = false;
    if (state.tokens >= 1) {
      state.tokens -= 1;
      allowed = true;
    }
    await this.cache.set(key, state, rule.windowMs * 10);

    const used = Math.round(rule.capacity - state.tokens);
    return {
      allowed,
      count: used,
      remaining: Math.max(0, Math.floor(state.tokens)),
      resetMs: rule.windowMs,
      limit: rule.capacity,
    };
  }
}

/** 令牌桶限流规则：容量 = 允许的最大突发；refillTokensPerWindow = 每个 windowMs 补充数 */
export interface TokenBucketRule {
  /** 桶容量（允许的最大突发请求数） */
  capacity: number;
  /** 每个窗口补充的令牌数 */
  refillTokensPerWindow: number;
  /** 补充周期（毫秒） */
  windowMs: number;
}
