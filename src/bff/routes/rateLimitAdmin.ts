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
  checkAccountLockout, adminUnlockAccount, adminUnlockIp,
  listStatus, type StatusItem,
} from '../aggregators/loginLockoutAggregator.js';

function requireAdmin(c: Ctx): Response | null {
  const roles = c.user?.roles ?? [];
  if (!roles.includes('admin')) return json(fail(ErrorCode.FORBIDDEN, '仅 admin 可操作限流状态'), 403);
  return null;
}

export const rateLimitAdminRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/rate-limit/status',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireAdmin(c);
      if (denied) return denied;
      return json(ok({ items: listStatus() as StatusItem[] }));
    },
  },
  {
    method: 'POST',
    path: '/api/v1/rate-limit/unlock',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireAdmin(c);
      if (denied) return denied;
      const b = (await c.body()) as Record<string, unknown>;
      const key = String(b.key ?? '');
      const type = String(b.type ?? '');
      if (!key || !type) return json(fail(ErrorCode.BAD_REQUEST, 'key/type 必填'), 400);
      let removed = false;
      if (type === 'account') removed = adminUnlockAccount(key);
      else if (type === 'ip') removed = adminUnlockIp(key);
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
      const b = (await c.body()) as Record<string, unknown>;
      const key = String(b.key ?? '');
      const type = String(b.type ?? '');
      if (!key) return json(fail(ErrorCode.BAD_REQUEST, 'key 必填'), 400);
      if (type === 'account') {
        const s = checkAccountLockout(key);
        return json(ok({ key, type: 'account', locked: !!s, lockedUntil: s?.lockedUntil ?? null }));
      }
      return json(ok({ key, type, locked: false }));
    },
  },
];
