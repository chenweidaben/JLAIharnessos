/**
 * 健澜科技 jlmedaios - STOP-BANG 筛查 BFF 路由（M59-A）
 * /api/v1/stopbang
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { assessView, listView, StopBangError } from '../aggregators/stopbangAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof StopBangError) {
    const code =
      err.status === 404 ? ErrorCode.NOT_FOUND
        : err.status === 403 ? ErrorCode.FORBIDDEN
          : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : 'STOP-BANG操作失败'), 500);
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

export const stopbangRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/stopbang',
    auth: true,
    handle: guarded('stopbang:assess', async (c, view) => {
      const b = await c.body<{
        visitId: string; sSnoring: boolean; tTired: boolean; oObserved: boolean; pPressure: boolean;
        bBmi: boolean; aAge: boolean; nNeck: boolean; gGender: boolean;
      }>();
      return assessView(view, b);
    }),
  },
  {
    method: 'GET',
    path: '/api/v1/stopbang',
    auth: true,
    handle: guarded('stopbang:view', async (c, view) => listView(view, c.query.get('visitId') ?? '')),
  },
];
