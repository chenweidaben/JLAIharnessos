/**
 * 健澜科技 jlmedaios - MDT 会诊路由（M66-A）
 * /api/v1/mdt
 * Copyright (c) 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  createView, listView, minutesView, scheduleView, MdtError,
} from '../aggregators/mdtAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof MdtError) {
    const code =
      err.status === 404 ? ErrorCode.NOT_FOUND
        : err.status === 403 ? ErrorCode.FORBIDDEN
          : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : 'MDT 操作失败'), 500);
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

export const mdtRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/mdt',
    auth: true,
    handle: guarded('mdt:request', async (c, view) => createView(view, await c.body())),
  },
  {
    method: 'GET',
    path: '/api/v1/mdt',
    auth: true,
    handle: guarded('mdt:view', async (c, view) => listView(view, c.query.get('visitId') ?? '')),
  },
  {
    method: 'POST',
    path: '/api/v1/mdt/:id/schedule',
    auth: true,
    handle: guarded('mdt:request', async (c, view) => {
      const b = await c.body<{ scheduledAt: string }>();
      return scheduleView(view, c.params.id, b.scheduledAt);
    }),
  },
  {
    method: 'POST',
    path: '/api/v1/mdt/:id/minutes',
    auth: true,
    handle: guarded('mdt:request', async (c, view) => {
      const b = await c.body<{ minutes: string; conclusion: string }>();
      return minutesView(view, c.params.id, b.minutes, b.conclusion);
    }),
  },
];
