/**
 * 健澜科技 jlmedaios - 药事看板路由（M77-A）
 * /api/v1/am-dash 、 /api/v1/am-dash?month=
 * Copyright (c) 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { dashboardView, submitView, AmDashError } from '../aggregators/amDashboardAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof AmDashError) {
    const code = err.status === 403 ? ErrorCode.FORBIDDEN : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '药事看板处理失败'), 500);
}

function guarded(perm: string, fn: (c: Ctx, view: AuthView) => Promise<unknown>) {
  return async (c: Ctx): Promise<Response> => {
    const denied = requirePermissionCode(c, perm);
    if (denied) return denied;
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
    try { return json(ok(await fn(c, view))); } catch (e) { return mapError(e); }
  };
}

export const amDashboardRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/am-dash',
    auth: true,
    handle: guarded('am_dash:submit', async (c, view) => submitView(view, await c.body() as Parameters<typeof submitView>[1])),
  },
  {
    method: 'GET',
    path: '/api/v1/am-dash',
    auth: true,
    handle: guarded('am_dash:view', async (c, view) => dashboardView(view, c.query.get('month') ?? '')),
  },
];
