/**
 * 健澜科技 jlmedaios - CDI 用药审查路由（M70-A）
 * /api/v1/cdi/review 、 /api/v1/cdi 、 /api/v1/cdi/:id/resolve
 * Copyright (c) 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { listView, resolveView, reviewView, CdiError } from '../aggregators/cdiAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof CdiError) {
    const code =
      err.status === 404 ? ErrorCode.NOT_FOUND
        : err.status === 403 ? ErrorCode.FORBIDDEN
          : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : 'CDI 审查失败'), 500);
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

export const cdiRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/cdi/review',
    auth: true,
    handle: guarded('cdi:review', async (c, view) => reviewView(view, await c.body())),
  },
  {
    method: 'GET',
    path: '/api/v1/cdi',
    auth: true,
    handle: guarded('cdi:view', async (c, view) => listView(view, c.query.get('patientId') ?? '')),
  },
  {
    method: 'POST',
    path: '/api/v1/cdi/:id/resolve',
    auth: true,
    handle: guarded('cdi:review', async (c, view) => resolveView(view, c.params.id)),
  },
];
