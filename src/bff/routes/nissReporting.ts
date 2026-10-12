/**
 * 健澜科技 jlmedaios - 院感 BFF 路由（M45-A）
 * /api/v1/niss。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { reportView, listView, patchStatusView, NissError } from '../aggregators/nissAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}
function mapError(err: unknown): Response {
  if (err instanceof NissError) {
    const code = err.status === 404 ? ErrorCode.NOT_FOUND : err.status === 403 ? ErrorCode.FORBIDDEN : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : 'niss failed'), 500);
}
function guarded<T>(fn: (c: Ctx, view: AuthView) => Promise<T>) {
  return async (c: Ctx): Promise<Response> => {
    const denied = requirePermissionCode(c, 'infection:view');
    if (denied) return denied;
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
    try { return json(ok(await fn(c, view))); } catch (e) { return mapError(e); }
  };
}

export const nissRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/niss',
    handle: guarded(async (c, view) => reportView(view, await c.body())),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/niss',
    handle: guarded((_c, view) => listView(view)),
    auth: true,
  },
  {
    method: 'PATCH',
    path: '/api/v1/niss/:id/status',
    handle: guarded(async (c, view) => patchStatusView(view, c.params.id, (await c.body() as any).status)),
    auth: true,
  },
];
