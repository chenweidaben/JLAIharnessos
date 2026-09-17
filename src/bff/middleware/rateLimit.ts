/**
 * 健澜科技数智医院智能体 - BFF 限流中间件（内存滑动窗口）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type ApiResponse, type Ctx, ErrorCode, fail, json } from '../types';

const buckets = new Map<string, number[]>();

/** 简单按 IP 限流：windowMs 内最多 limit 次 */
export function rateLimit(c: Ctx, limit = 300, windowMs = 60_000): Response | null {
  const ip = c.req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
  const now = Date.now();
  const hits = (buckets.get(ip) ?? []).filter((t) => now - t < windowMs);
  hits.push(now);
  buckets.set(ip, hits);
  if (hits.length > limit) {
    return json(
      fail<ApiResponse>(ErrorCode.RATE_LIMITED, '请求过于频繁，请稍后再试', c.traceId),
      429,
    );
  }
  return null;
}
