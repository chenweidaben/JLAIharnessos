/**
 * 健澜AI原生医院操作系统OS - P4-3 登录防爆破 + 速率限制 admin 路由
 *
 * 前缀 /api/v1/rate-limit：
 *  - GET  /status                当前所有锁定项（admin）
 *  - POST /unlock                手动解锁账号/IP（admin）
 *  - POST /check                 查某账号/IP 状态（admin）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  checkAccountLockoutAsync, adminUnlockAccountAsync, adminUnlockIpAsync,
  isDistributedRateLimit,
  listStatus,
} from '../aggregators/loginLockoutAggregator.js';

function requireAdmin(c: Ctx): Response | null {
  const roles = c.user?.roles ?? [];
  if (!roles.includes('admin')) return json(fail(ErrorCode.FORBIDDEN, '仅 admin 可操作限流状态'), 403);
  return null;
}

/** 安全取字符串字段：非字符串一律为空串（避免 String(obj) 退化为 '[object Object]'） */
function strField(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export const rateLimitAdminRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/rate-limit/status',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireAdmin(c);
      if (denied) return denied;
      return json(ok({
        backend: isDistributedRateLimit() ? 'redis' : 'memory',
        // 分布式模式下内存态 listStatus 仅为本地兜底快照，不代表全量
        items: listStatus(),
      }));
    },
  },
  {
    method: 'POST',
    path: '/api/v1/rate-limit/unlock',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireAdmin(c);
      if (denied) return denied;
      const b = await c.body<Record<string, unknown>>();
      const key = strField(b.key);
      const type = strField(b.type);
      if (!key || !type) return json(fail(ErrorCode.BAD_REQUEST, 'key/type 必填'), 400);
      let removed = false;
      if (type === 'account') removed = await adminUnlockAccountAsync(key);
      else if (type === 'ip') removed = await adminUnlockIpAsync(key);
      else return json(fail(ErrorCode.BAD_REQUEST, 'type 必须为 account/ip'), 400);
      return json(ok({ key, type, removed }));
    },
  },
  {
    method: 'POST',
    path: '/api/v1/rate-limit/check',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireAdmin(c);
      if (denied) return denied;
      const b = await c.body<Record<string, unknown>>();
      const key = strField(b.key);
      const type = strField(b.type);
      if (!key) return json(fail(ErrorCode.BAD_REQUEST, 'key 必填'), 400);
      if (type === 'account') {
        const s = await checkAccountLockoutAsync(key);
        return json(ok({ key, type: 'account', locked: !!s, lockedUntil: s?.lockedUntil ?? null }));
      }
      return json(ok({ key, type, locked: false }));
    },
  },
];
