/**
 * 健澜科技 jlmedaios - PACU BFF 路由（M31-B）
 * /api/v1/pacu-records。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { recordPacuView, listPacuView, PacuError } from '../aggregators/pacuRecordAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}
function mapError(err: unknown): Response {
  if (err instanceof PacuError) {
    const code = err.status === 404 ? ErrorCode.NOT_FOUND
      : err.status === 403 ? ErrorCode.FORBIDDEN : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : 'PACU 失败'), 500);
}
function guarded<T>(perm: string, fn: (c: Ctx, view: AuthView) => Promise<T>) {
  return async (c: Ctx): Promise<Response> => {
    const denied = requirePermissionCode(c, perm);
    if (denied) return denied;
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
    try { return json(ok(await fn(c, view))); } catch (e) { return mapError(e); }
  };
}

export const pacuRecordRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/pacu-records',
    handle: guarded('pacu:record', async (c, view) =>
      recordPacuView(view, await c.body<Parameters<typeof recordPacuView>[1]>())),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/pacu-records',
    handle: guarded('pacu:view', (c, view) => listPacuView(view, c.query.get('visitId') ?? '')),
    auth: true,
  },
];
