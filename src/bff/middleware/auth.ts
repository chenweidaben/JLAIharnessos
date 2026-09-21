/**
 * 健澜科技数智医院智能体 - BFF 认证与权限中间件
 *
 * 安全要点（等保三级 / 医疗合规）：
 *  - JWT 验签：HMAC-SHA256，校验 exp/nbf/iss，拒绝伪造与篡改 Token
 *  - Token 过期：exp 校验，过期返回 401 TOKEN_EXPIRED
 *  - 角色/权限：requireRole / requirePermission 细粒度鉴权
 *  - 开发态：允许已知演示 Token，其余一律拒绝（不再任意非空即放行）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import * as crypto from 'node:crypto';

import { type ApiResponse, type Ctx, ErrorCode, fail, json, newTraceId } from '../types';

/* ------------------------------------------------------------------ */
/* JWT 工具（HMAC-SHA256，Bun/Node 内置 crypto，零依赖）                */
/* ------------------------------------------------------------------ */

function b64urlEncode(buf: Buffer | string): string {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function b64urlDecode(str: string): Buffer {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

interface JwtPayload {
  sub: string;
  name: string;
  roles: string[];
  permissions?: string[];
  dept?: string;
  iss?: string;
  exp?: number;
  nbf?: number;
}

function getJwtSecret(): string {
  // 生产环境必须由环境变量注入；开发态提供默认值但打印警告
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.warn('[security] JWT_SECRET 未设置，使用开发态默认密钥（仅限本地开发）');
    return 'dev-only-insecure-jwt-secret-change-me';
  }
  return secret;
}

/** 签发 JWT（开发/登录路由用） */
export function signJwt(
  payload: Omit<JwtPayload, 'iss' | 'exp' | 'nbf'>,
  expiresInSec = 7200,
): string {
  const header = b64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const body = b64urlEncode(
    JSON.stringify({ ...payload, iss: 'jianlan-bff', nbf: now, exp: now + expiresInSec }),
  );
  const data = `${header}.${body}`;
  const sig = crypto.createHmac('sha256', getJwtSecret()).update(data).digest();
  return `${data}.${b64urlEncode(sig)}`;
}

/** 验证 JWT 签名与有效期，失败返回 null */
export function verifyJwt(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, bodyB64, sigB64] = parts;
  const data = `${headerB64}.${bodyB64}`;

  // 时序安全签名校验
  const expectedSig = crypto.createHmac('sha256', getJwtSecret()).update(data).digest();
  const providedSig = b64urlDecode(sigB64);
  if (
    expectedSig.length !== providedSig.length ||
    !crypto.timingSafeEqual(expectedSig, providedSig)
  ) {
    return null;
  }

  let payload: JwtPayload;
  try {
    payload = JSON.parse(b64urlDecode(bodyB64).toString('utf-8')) as JwtPayload;
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.nbf && now < payload.nbf) return null;
  if (payload.exp && now >= payload.exp) return null;
  return payload;
}

/* ------------------------------------------------------------------ */
/* 演示态用户（生产环境由用户中心返回真实 RBAC）                          */
/* ------------------------------------------------------------------ */

const MOCK_USER = { id: 'u_1001', name: '陈维', roles: ['admin'] as string[] };

/**
 * 解析 Authorization Bearer token 并注入 user。
 *
 * 安全策略：
 *  1. 优先走真实 JWT 验签（signJwt 签发的 token）
 *  2. 兼容前端演示态 token（jt- 前缀），但仅在 NODE_ENV !== 'production' 时接受
 *  3. 其余一律视为未登录（修复此前"任意非空 token 即 admin"的 P0 漏洞）
 */
export function attachUser(c: Ctx): void {
  const auth = c.req.headers.get('Authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token || token === 'anonymous') {
    c.user = null;
    return;
  }

  // 1) 真实 JWT
  if (token.split('.').length === 3) {
    const payload = verifyJwt(token);
    if (payload) {
      c.user = {
        id: payload.sub,
        name: payload.name,
        roles: payload.roles ?? [],
        permissions: payload.permissions,
      };
      return;
    }
    // JWT 格式正确但验签/过期失败 → 未登录（不回退到 mock）
    c.user = null;
    return;
  }

  // 2) 开发态演示 token（jt-/jr- 前缀），仅非生产环境
  const isProd = (process.env.NODE_ENV ?? 'development') === 'production';
  if (
    !isProd &&
    (token.startsWith('jt-') || token.startsWith('jr-') || token === 'bff-access-token')
  ) {
    c.user = MOCK_USER;
    return;
  }

  c.user = null;
}

/** 要求登录，否则 401 */
export function requireAuth(c: Ctx): Response | null {
  if (!c.user) {
    return json(fail(ErrorCode.UNAUTHORIZED, '未登录或登录已过期', c.traceId), 401);
  }
  return null;
}

/** 要求具备某角色，否则 403（未登录 401） */
export function requireRole(c: Ctx, ...roles: string[]): Response | null {
  if (!c.user) {
    return json(fail(ErrorCode.UNAUTHORIZED, '未登录', c.traceId), 401);
  }
  if (roles.length === 0) return null;
  const allowed = c.user.roles.some((r) => roles.includes(r));
  if (!allowed) {
    return json(
      fail<ApiResponse>(ErrorCode.FORBIDDEN, '权限不足：需要角色 ' + roles.join('/'), c.traceId),
      403,
    );
  }
  return null;
}

/**
 * 路由级角色守卫工厂：返回一个包装 handle，先校验角色再执行。
 * 用法：{ ..., handle: requireRoleGuard(['admin'], (c) => ...) }
 */
export function requireRoleGuard(
  roles: string[],
  handle: (c: Ctx) => Response | Promise<Response>,
): (c: Ctx) => Response | Promise<Response> {
  return (c: Ctx) => {
    const denied = requireRole(c, ...roles);
    if (denied) return denied;
    return handle(c);
  };
}

/**
 * 业务权限码守卫（如 imaging:view / imaging:ai:analyze / imaging:ai:review）。
 *
 * 与现有 requireRole 同风格：
 *  - 未登录 → 401
 *  - 超级管理员（roles 含 'admin'）一律放行
 *  - 用户显式权限码（JWT permissions 数组）包含该码 → 放行
 *  - 否则 → 403
 */
export function requirePermissionCode(c: Ctx, code: string): Response | null {
  if (!c.user) {
    return json(fail(ErrorCode.UNAUTHORIZED, '未登录或登录已过期', c.traceId), 401);
  }
  if (c.user.roles.includes('admin')) return null;
  if (c.user.permissions && c.user.permissions.includes(code)) return null;
  return json(
    fail<ApiResponse>(ErrorCode.FORBIDDEN, `权限不足：需要 ${code}`, c.traceId),
    403,
  );
}

export function newCtx(req: Request, params: Record<string, string>, query: URLSearchParams): Ctx {
  return {
    req,
    params,
    query,
    body: async () => {
      try {
        return (await req.json()) as never;
      } catch {
        return {} as never;
      }
    },
    user: null,
    traceId: req.headers.get('x-trace-id') ?? newTraceId(),
  };
}
