/**
 * 健澜科技 jlmedaios - 急诊绿色通道超时催办 BFF 路由（M37-A）
 * /api/v1/er-green。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { scanAndEscalate, listOverdue, ErGreenError } from '../aggregators/erGreenEscalationAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}
function mapError(err: unknown): Response {
  if (err instanceof ErGreenError) {
    const code = err.status === 403 ? ErrorCode.FORBIDDEN : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : 'er-green scan failed'), 500);
}
function guarded<T>(fn: (c: Ctx, view: AuthView) => Promise<T>) {
  return async (c: Ctx): Promise<Response> => {
    const denied = requirePermissionCode(c, 'er_triage:view');
    if (denied) return denied;
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
    try { return json(ok(await fn(c, view))); } catch (e) { return mapError(e); }
  };
}

export const erGreenRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/er-green/scan',
    handle: guarded((_c, view) => scanAndEscalate(view)),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/er-green/overdue',
    handle: guarded((_c, view) => listOverdue(view)),
    auth: true,
  },
];
