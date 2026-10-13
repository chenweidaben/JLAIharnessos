/**
 * 健澜科技 jlmedaios - 复诊号源预约 BFF 路由（M62-A）
 * /api/v1/followup-appointments
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  bookView, cancelView, listView, recommendView, FollowupApptError,
} from '../aggregators/followupApptAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof FollowupApptError) {
    const code =
      err.status === 404 ? ErrorCode.NOT_FOUND
        : err.status === 403 ? ErrorCode.FORBIDDEN
          : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '复诊预约操作失败'), 500);
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

export const followupApptRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/followup-appointments/recommend/:planId',
    auth: true,
    handle: guarded('followup_appt:view', async (c, view) => recommendView(view, c.params.planId)),
  },
  {
    method: 'POST',
    path: '/api/v1/followup-appointments/:planId/book',
    auth: true,
    handle: guarded('followup_appt:book', async (c, view) => {
      const b = await c.body<{ scheduleId: string; appointmentDate: string; department: string }>();
      return bookView(view, c.params.planId, b.scheduleId, b.appointmentDate, b.department);
    }),
  },
  {
    method: 'GET',
    path: '/api/v1/followup-appointments',
    auth: true,
    handle: guarded('followup_appt:view', async (c, view) => listView(view, c.query.get('visitId') ?? '')),
  },
  {
    method: 'POST',
    path: '/api/v1/followup-appointments/:id/cancel',
    auth: true,
    handle: guarded('followup_appt:book', async (c, view) => cancelView(view, c.params.id)),
  },
];
