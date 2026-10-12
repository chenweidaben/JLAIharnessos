/**
 * 健澜科技 jlmedaios - 体检中心 BFF 路由（M40-A）
 * /api/v1/healthcheck。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { listPackagesView, createOrderView, completeItemView, getOrderView, HealthCheckError } from '../aggregators/healthCheckAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}
function mapError(err: unknown): Response {
  if (err instanceof HealthCheckError) {
    const code = err.status === 404 ? ErrorCode.NOT_FOUND : err.status === 403 ? ErrorCode.FORBIDDEN : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : 'healthcheck failed'), 500);
}
function guarded<T>(fn: (c: Ctx, view: AuthView) => Promise<T>) {
  return async (c: Ctx): Promise<Response> => {
    const denied = requirePermissionCode(c, 'healthcheck:view');
    if (denied) return denied;
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
    try { return json(ok(await fn(c, view))); } catch (e) { return mapError(e); }
  };
}

export const healthCheckRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/healthcheck/packages',
    handle: guarded((_c, view) => listPackagesView(view)),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/healthcheck/orders',
    handle: guarded(async (c, view) => createOrderView(view, await c.body())),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/healthcheck/orders/:id/items/:item/complete',
    handle: guarded((c, view) => completeItemView(view, c.params.id, c.params.item)),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/healthcheck/orders/:id',
    handle: guarded((c, view) => getOrderView(view, c.params.id)),
    auth: true,
  },
];
