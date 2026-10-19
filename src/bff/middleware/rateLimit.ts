/**
 * 健澜科技数智医院智能体 - BFF 限流中间件（内存滑动窗口）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type ApiResponse, type Ctx, ErrorCode, fail, json } from '../types';

const buckets = new Map<string, number[]>();

/** 登录专用桶：独立于全局限流，更严格（5 次/分钟/IP） */
const loginBuckets = new Map<string, number[]>();

/** 登录限流参数：1 分钟窗口内最多 5 次 */
const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 60_000;

/** 提取客户端 IP（与全局限流一致：x-forwarded-for 首段优先，回退 socket IP） */
function clientIpOf(c: Ctx): string {
  return (
    c.req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.clientIp ||
    '127.0.0.1'
  );
}

/** 简单按 IP 限流：windowMs 内最多 limit 次 */
export function rateLimit(c: Ctx, limit = 300, windowMs = 60_000): Response | null {
  // DEMO_MODE 下不限流（本地演示/压测场景）
  if (process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true') return null;
  const ip = clientIpOf(c);
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

/**
 * 登录接口专用限流：同一 IP 在 1 分钟窗口内最多 5 次尝试。
 *
 * 独立内存 Map（loginBuckets），与全局限流隔离，避免误伤正常业务流量；
 * 用于缓解暴力破解 / 凭证撞库。超限返回 429。
 *
 * @param c 请求上下文
 * @returns 超限返回 429 Response，放行返回 null
 */
export function loginRateLimit(c: Ctx): Response | null {
  if (process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true') return null;
  const ip = clientIpOf(c);
  const now = Date.now();
  const hits = (loginBuckets.get(ip) ?? []).filter((t) => now - t < LOGIN_WINDOW_MS);
  hits.push(now);
  loginBuckets.set(ip, hits);
  if (hits.length > LOGIN_LIMIT) {
    return json(
      fail<ApiResponse>(
        ErrorCode.RATE_LIMITED,
        '登录尝试过于频繁，请 1 分钟后再试',
        c.traceId,
      ),
      429,
    );
  }
  return null;
}
