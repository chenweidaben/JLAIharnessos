/**
 * 健澜科技杠OS（jlmedaios）- 分级多维限流器（进程内）
 *
 * 面向 BFF 入口的精细化限流：
 *   - 多维 key：调用方自行拼装 租户/院区 + 路由 + 用户/IP，如 "T001:login:u123"；
 *   - 分级 tier：不同业务用不同档位——登录/改密等高危接口严格，查询/检索接口宽松；
 *   - 双算法：滑动窗口（精确，适合登录失败锁定）/ 令牌桶（允许突发，适合查询）。
 *
 * 与 src/cache/RateLimiter（ICache 固定窗口，适合跨实例分布式限流）互补：
 * 本类为进程内零依赖实现，用于单实例边缘限流与压测/演示，时钟可注入。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { MedicalAgentError } from '../core/errors/index.js';
import { ResilienceErrorCodes } from './CircuitBreaker.js';

export type RateAlgorithm = 'sliding-window' | 'token-bucket';

export interface TierRule {
  /** 限流算法 */
  algorithm: RateAlgorithm;
  /**
   * 滑动窗口：窗口内最大次数；令牌桶：桶容量（允许的最大突发）。
   */
  limit: number;
  /** 滑动窗口：窗口大小（毫秒） */
  windowMs?: number;
  /** 令牌桶：每毫秒补充的令牌数（= 每秒配额 / 1000） */
  refillPerMs?: number;
}

export interface RateDecision {
  allowed: boolean;
  /** 当前剩余可用额度 */
  remaining: number;
  /** 多久后可重试（毫秒），被拒绝时有意义 */
  retryAfterMs: number;
  /** 当前 key 已用次数（滑动窗口）/ 当前桶内令牌（令牌桶） */
  used: number;
}

interface SlidingState {
  hits: number[];
}

interface TokenBucketState {
  tokens: number;
  lastRefill: number;
}

export class TieredRateLimiter {
  private readonly tiers = new Map<string, TierRule>();
  private readonly sliding = new Map<string, SlidingState>();
  private readonly buckets = new Map<string, TokenBucketState>();
  private readonly now: () => number;

  constructor(now?: () => number) {
    this.now = now ?? (() => Date.now());
  }

  /** 注册一个限流档位 */
  registerTier(name: string, rule: TierRule): this {
    if (rule.algorithm === 'sliding-window') {
      if (!rule.windowMs || rule.windowMs <= 0) {
        throw new MedicalAgentError('VALIDATION_ERROR', `档位[${name}]滑动窗口需提供正 windowMs`);
      }
      if (rule.limit <= 0) {
        throw new MedicalAgentError('VALIDATION_ERROR', `档位[${name}]limit 必须为正整数`);
      }
    }
    if (rule.algorithm === 'token-bucket') {
      if (!rule.refillPerMs || rule.refillPerMs <= 0) {
        throw new MedicalAgentError('VALIDATION_ERROR', `档位[${name}]令牌桶需提供正 refillPerMs`);
      }
      if (rule.limit <= 0) {
        throw new MedicalAgentError('VALIDATION_ERROR', `档位[${name}]桶容量 limit 必须为正`);
      }
    }
    this.tiers.set(name, rule);
    return this;
  }

  /**
   * 消耗一次额度。
   * @param key  多维拼装 key（租户:路由:用户/IP）
   * @param tierName 已注册的档位名
   */
  consume(key: string, tierName: string): RateDecision {
    const rule = this.tiers.get(tierName);
    if (!rule) {
      throw new MedicalAgentError('VALIDATION_ERROR', `限流档位[${tierName}]未注册`, {
        tier: tierName,
        known: [...this.tiers.keys()],
      });
    }
    if (rule.algorithm === 'sliding-window') {
      return this.consumeSliding(key, tierName, rule);
    }
    return this.consumeBucket(key, tierName, rule);
  }

  /** 只读探测当前 key 状态（不消耗） */
  peek(key: string, tierName: string): number {
    const rule = this.tiers.get(tierName);
    if (!rule) return 0;
    if (rule.algorithm === 'sliding-window') {
      const st = this.sliding.get(key);
      if (!st) return 0;
      const cutoff = this.now() - (rule.windowMs ?? 0);
      return st.hits.filter((t) => t >= cutoff).length;
    }
    const st = this.buckets.get(key);
    return st ? Math.floor(st.tokens) : rule.limit;
  }

  /** 清空某 key 状态（如登录成功后解锁） */
  reset(key: string): void {
    this.sliding.delete(key);
    this.buckets.delete(key);
  }

  private consumeSliding(key: string, tierName: string, rule: TierRule): RateDecision {
    const windowMs = rule.windowMs ?? 1;
    const now = this.now();
    const cutoff = now - windowMs;
    let st = this.sliding.get(key);
    if (!st) {
      st = { hits: [] };
      this.sliding.set(key, st);
    }
    // 清理窗口外记录
    st.hits = st.hits.filter((t) => t >= cutoff);
    const used = st.hits.length;
    if (used >= rule.limit) {
      const oldest = st.hits[0] ?? now;
      const retryAfterMs = Math.max(1, windowMs - (now - oldest));
      return { allowed: false, remaining: 0, retryAfterMs, used, };
    }
    st.hits.push(now);
    return { allowed: true, remaining: rule.limit - used - 1, retryAfterMs: 0, used: used + 1 };
  }

  private consumeBucket(key: string, tierName: string, rule: TierRule): RateDecision {
    const now = this.now();
    let st = this.buckets.get(key);
    if (!st) {
      st = { tokens: rule.limit, lastRefill: now };
      this.buckets.set(key, st);
    }
    // 按时间补充令牌（惰性）
    const elapsed = now - st.lastRefill;
    st.tokens = Math.min(rule.limit, st.tokens + elapsed * (rule.refillPerMs ?? 0));
    st.lastRefill = now;

    if (st.tokens < 1) {
      // 距离下一个令牌的时间
      const retryAfterMs = Math.ceil((1 - st.tokens) / (rule.refillPerMs ?? 1));
      return { allowed: false, remaining: 0, retryAfterMs, used: Math.floor(st.tokens) };
    }
    st.tokens -= 1;
    return { allowed: true, remaining: Math.floor(st.tokens), retryAfterMs: 0, used: rule.limit - Math.floor(st.tokens) };
  }
}

/** 便捷工厂：直接拒绝时抛出受控错误（供 BFF 中间件使用） */
export function assertAllowed(decision: RateDecision, scope: string): void {
  if (!decision.allowed) {
    throw new MedicalAgentError(
      ResilienceErrorCodes.RATE_LIMITED,
      `请求被限流[${scope}]，请稍后再试`,
      { scope, retryAfterMs: decision.retryAfterMs },
    );
  }
}
