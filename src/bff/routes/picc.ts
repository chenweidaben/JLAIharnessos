/**
 * 健澜科技 jlmedaios - PICC 维护路由（M68-A）
 * /api/v1/picc-maintenances
 * Copyright (c) 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { listView, recordView, PiccError } from '../aggregators/piccAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof PiccError) {
    const code =
      err.status === 404 ? ErrorCode.NOT_FOUND
        : err.status === 403 ? ErrorCode.FORBIDDEN
          : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : 'PICC 维护操作失败'), 500);
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

export const piccRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/picc-maintenances',
    auth: true,
    handle: guarded('picc:maintain', async (c, view) => recordView(view, await c.body())),
  },
  {
    method: 'GET',
    path: '/api/v1/picc-maintenances',
    auth: true,
    handle: guarded('picc:view', async (c, view) => listView(view, c.query.get('patientId') ?? '')),
  },
];
