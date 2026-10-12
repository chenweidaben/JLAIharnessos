/**
 * 健澜科技 jlmedaios - 慢病管理 BFF 路由（M39-A）
 * /api/v1/chronic。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { createPlanView, recordVitalsView, listChronicView, ChronicError } from '../aggregators/chronicDiseaseAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}
function mapError(err: unknown): Response {
  if (err instanceof ChronicError) {
    const code = err.status === 404 ? ErrorCode.NOT_FOUND : err.status === 403 ? ErrorCode.FORBIDDEN : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : 'chronic failed'), 500);
}
function guarded<T>(fn: (c: Ctx, view: AuthView) => Promise<T>) {
  return async (c: Ctx): Promise<Response> => {
    const denied = requirePermissionCode(c, 'chronic:view');
    if (denied) return denied;
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
    try { return json(ok(await fn(c, view))); } catch (e) { return mapError(e); }
  };
}

export const chronicRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/chronic/plans',
    handle: guarded(async (c, view) => createPlanView(view, await c.body())),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/chronic/vitals',
    handle: guarded(async (c, view) => recordVitalsView(view, await c.body())),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/chronic',
    handle: guarded((c, view) => listChronicView(view, c.query.get('patientId') ?? '')),
    auth: true,
  },
];
