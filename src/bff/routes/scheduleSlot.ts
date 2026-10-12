/**
 * 健澜科技 jlmedaios - 号源排班路由（M19-A）
 *
 * /api/v1/schedule-slots。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  bookSlotView,
  cancelBookingView,
  createScheduleView,
  listSlotsView,
  ScheduleError,
} from '../aggregators/scheduleSlotAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof ScheduleError) {
    const code =
      err.status === 404 ? ErrorCode.NOT_FOUND
        : err.status === 403 ? ErrorCode.FORBIDDEN
          : err.status === 409 ? ErrorCode.CONFLICT
            : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  const message = err instanceof Error ? err.message : '排班处理失败';
  return json(fail(ErrorCode.INTERNAL_ERROR, message), 500);
}

function guarded<T>(perm: string, fn: (c: Ctx, view: AuthView) => Promise<T>) {
  return async (c: Ctx): Promise<Response> => {
    const denied = requirePermissionCode(c, perm);
    if (denied) return denied;
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);
    try {
      return json(ok(await fn(c, view)));
    } catch (err) {
      return mapError(err);
    }
  };
}

export const scheduleSlotRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/schedule-slots',
    handle: guarded('schedule:book', (c, view) => listSlotsView(view, c.query.get('department') ?? undefined, c.query.get('workDate') ?? undefined)),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/schedule-slots/schedule',
    handle: guarded('schedule:manage', async (c, view) => createScheduleView(view, await c.body<Parameters<typeof createScheduleView>[1]>())),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/schedule-slots/:id/book',
    handle: guarded('schedule:book', (c, view) => bookSlotView(view, c.params.id)),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/schedule-slots/:id/cancel',
    handle: guarded('schedule:book', (c, view) => cancelBookingView(view, c.params.id)),
    auth: true,
  },
];
