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
}
