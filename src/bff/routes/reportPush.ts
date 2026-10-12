/**
 * 健澜科技 jlmedaios - 报告推送路由（M19-B）
 * /api/v1/report-pushes
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { listMineView, pushView, ReportPushError, viewView } from '../aggregators/reportPushAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof ReportPushError) {
    const code =
      err.status === 404 ? ErrorCode.NOT_FOUND
        : err.status === 403 ? ErrorCode.FORBIDDEN
          : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '报告推送失败'), 500);
}

function guarded<T>(perm: string, fn: (c: Ctx, view: AuthView) => Promise<T>) {
  return async (c: Ctx): Promise<Response> => {
    const denied = requirePermissionCode(c, perm);
    if (denied) return denied;
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);
    try { return json(ok(await fn(c, view))); } catch (err) { return mapError(err); }
  };
}

export const reportPushRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/report-pushes',
    handle: guarded('report:view_patient', (c, view) => listMineView(view, c.query.get('patientId') ?? '')),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/report-pushes',
    handle: guarded('report_push:manage', async (c, view) => pushView(view, await c.body<Parameters<typeof pushView>[1]>())),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/report-pushes/:id/view',
    handle: guarded('report:view_patient', (c, view) => viewView(view, c.params.id)),
    auth: true,
  },
];
