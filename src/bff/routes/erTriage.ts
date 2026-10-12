/**
 * 健澜科技 jlmedaios - 急诊预检分诊 BFF 路由（M35-A）
 * /api/v1/er-triage。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { triageView, getTriageView, TriageError } from '../aggregators/erTriageAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}
function mapError(err: unknown): Response {
  if (err instanceof TriageError) {
    const code = err.status === 404 ? ErrorCode.NOT_FOUND
      : err.status === 403 ? ErrorCode.FORBIDDEN : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '分诊失败'), 500);
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

export const erTriageRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/er-triage',
    handle: guarded(async (c, view) => {
      const b = await c.body<{
        visitId: string; chiefComplaint: string;
        heartRate?: number | null; systolicBp?: number | null; diastolicBp?: number | null;
        respRate?: number | null; spo2?: number | null; temperatureC?: number | null; gcs?: number | null;
      }>();
      return triageView(view, b);
    }),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/er-triage',
    handle: guarded((c, view) => getTriageView(view, c.query.get('visitId') ?? '')),
    auth: true,
  },
];
