/**
 * 健澜科技 jlmedaios - 化疗提醒 BFF 路由（M43-A）
 * /api/v1/chemo/reminders。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { scanDueReminders, listUpcoming, ChemoReminderError } from '../aggregators/chemoReminderAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}
function mapError(err: unknown): Response {
  if (err instanceof ChemoReminderError) {
    return json(fail(ErrorCode.FORBIDDEN, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : 'chemo reminder failed'), 500);
}
function guarded<T>(fn: (c: Ctx, view: AuthView) => Promise<T>) {
  return async (c: Ctx): Promise<Response> => {
    const denied = requirePermissionCode(c, 'oncology:view');
    if (denied) return denied;
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
    try { return json(ok(await fn(c, view))); } catch (e) { return mapError(e); }
  };
}

export const chemoReminderRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/chemo/reminders/scan',
    handle: guarded((_c, view) => scanDueReminders(view)),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/chemo/reminders/upcoming',
    handle: guarded((_c, view) => listUpcoming(view)),
    auth: true,
  },
];
