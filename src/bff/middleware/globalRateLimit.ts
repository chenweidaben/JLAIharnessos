/**
 * 健澜AI原生医院操作系统OS - P4-4 通用 read/write 限流全局中间件
 *
 * - GET /api/v1/*：每 IP 100 req/min
 * - 其他方法 /api/v1/*：每 IP 30 req/min
 * - 超限 → 429 code=42900 + Retry-After header
 * - 白名单：/health /ready /metrics /livez /version /ws/、精确
 *   /api/v1/health /api/v1/system/health、/api/v1/audit/*（审计查询不限流）
 * - 127.0.0.1 本机不限（本地开发/E2E）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json } from '../types';
import { takeReadToken, takeWriteToken } from '../aggregators/loginLockoutAggregator.js';

const SKIP_PREFIXES = [
  '/health', '/ready', '/metrics', '/livez', '/version', '/ws/',
  '/api/v1/audit/',
];
const SKIP_EXACT = new Set(['/api/v1/health', '/api/v1/system/health']);

function ipOf(c: Ctx): string {
  return (
    c.req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.clientIp ||
    '127.0.0.1'
  );
}

/**
 * 在 server.ts 路由分发前调用。返回非 null Response 则直接 429 短路。
 */
export function globalRateLimit(c: Ctx): Response | null {
  const url = new URL(c.req.url, 'http://internal');
  const path = url.pathname;
  if (!path.startsWith('/api/v1/')) return null;
  for (const p of SKIP_PREFIXES) if (path.startsWith(p)) return null;
  if (SKIP_EXACT.has(path)) return null;

  const ip = ipOf(c);
  // 本机回环免流：仅在开发/演示环境且未启用反代时生效。
  // 生产部署在 Nginx/负载均衡后时，所有外部请求源 IP 都会被反代归一成 127.0.0.1，
  // 若无条件免流等于对全网取消限流。因此必须同时满足：
  //   1) NODE_ENV=development 或 DEMO_MODE=1
  //   2) TRUST_PROXY 未设为 '1'（反代场景下即使开发环境也不免）
  const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || ip === '::ffff:127.0.0.1';
  const devMode = process.env.NODE_ENV === 'development' || process.env.DEMO_MODE === '1';
  const noProxy = process.env.TRUST_PROXY !== '1';
  if (isLocal && devMode && noProxy) return null;

  const method = c.req.method.toUpperCase();
  const retrySec = method === 'GET' ? takeReadToken(ip) : takeWriteToken(ip);
  if (retrySec === null) return null;

  const res = json(fail(ErrorCode.RATE_LIMITED, `请求过于频繁，请 ${retrySec}s 后再试`), 429);
  res.headers.set('Retry-After', String(retrySec));
  return res;
}
