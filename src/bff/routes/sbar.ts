/**
 * 健澜科技 jlmedaios - SBAR 交接路由（M73-A）
 * /api/v1/sbar 、 /api/v1/sbar?visitId= 、 /api/v1/sbar/:id/receive 、 /api/v1/sbar/:id/close
 * Copyright (c) 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { closeView, createView, listView, receiveView, SbarError } from '../aggregators/sbarAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof SbarError) {
    const code =
      err.status === 404 ? ErrorCode.NOT_FOUND
        : err.status === 409 ? ErrorCode.CONFLICT
          : err.status === 403 ? ErrorCode.FORBIDDEN
            : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : 'SBAR 交接处理失败'), 500);
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

export const sbarRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/sbar',
    auth: true,
    handle: guarded('sbar:create', async (c, view) => createView(view, await c.body())),
  },
  {
    method: 'GET',
    path: '/api/v1/sbar',
    auth: true,
    handle: guarded('sbar:view', async (c, view) => listView(view, c.query.get('visitId') ?? '')),
  },
  {
    method: 'POST',
    path: '/api/v1/sbar/:id/receive',
    auth: true,
    handle: guarded('sbar:view', async (c, view) => receiveView(view, c.params.id)),
  },
  {
    method: 'POST',
    path: '/api/v1/sbar/:id/close',
    auth: true,
    handle: guarded('sbar:view', async (c, view) => closeView(view, c.params.id)),
  },
];
