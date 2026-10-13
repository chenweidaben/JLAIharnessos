/**
 * 健澜科技 jlmedaios - 满意度提醒路由（M64-A）
 * /api/v1/satisfaction
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  myPendingView, scanView, ReminderError,
} from '../aggregators/satisfactionReminderAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof ReminderError) {
    return json(fail(ErrorCode.FORBIDDEN, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '满意度提醒操作失败'), 500);
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

export const satisfactionReminderRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/satisfaction/notify-scan',
    auth: true,
    handle: guarded('satisfaction:notify', async (_c, view) => scanView(view)),
  },
  {
    method: 'GET',
    path: '/api/v1/satisfaction/my-pending',
    auth: true,
    handle: guarded('satisfaction:notify', async (_c, view) => myPendingView(view)),
  },
];
