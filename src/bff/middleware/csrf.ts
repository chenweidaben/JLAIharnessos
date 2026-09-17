/**
 * 健澜科技数智医院智能体 - BFF CSRF 防护中间件
 *
 * 采用 "双重提交 Cookie + Token" 模式：
 *  - 前端登录后下发 csrf-token cookie
 *  - 状态变更请求（POST/PUT/DELETE/PATCH）需携带 X-CSRF-Token 头，
 *    且与 cookie 中值一致
 *  - GET/HEAD/OPTIONS 不校验（幂等只读）
 *
 * 注意：当前 BFF 演示态以 Bearer Token 鉴权（非 Cookie 会话），
 * 原生 Bearer Token 方案天然免疫 CSRF（浏览器不会自动携带 Authorization 头）。
 * 本中间件作为纵深防御，在切换到 Cookie 会话模式时自动生效。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import * as crypto from 'node:crypto';

import { type Ctx, ErrorCode, fail, json } from '../types';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** 生成 CSRF Token（登录/刷新时调用，写入 cookie） */
export function issueCsrfToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * 校验状态变更请求的 CSRF Token。
 * 返回 null 表示通过；返回 Response 表示拒绝。
 */
export function verifyCsrf(c: Ctx): Response | null {
  if (SAFE_METHODS.has(c.req.method.toUpperCase())) return null;

  // Bearer Token 鉴权模式下，浏览器不会自动发送 Authorization 头，
  // 天然免疫 CSRF。仅当请求携带 cookie 时才需校验。
  const cookieHeader = c.req.headers.get('Cookie') ?? '';
  if (!cookieHeader) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((kv) => {
      const idx = kv.indexOf('=');
      return idx < 0 ? [kv.trim(), ''] : [kv.slice(0, idx).trim(), kv.slice(idx + 1).trim()];
    }),
  );
  const cookieToken = cookies['csrf-token'];
  const headerToken = c.req.headers.get('x-csrf-token');

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return json(fail(ErrorCode.FORBIDDEN, 'CSRF 校验失败', c.traceId), 403);
  }
  return null;
}
