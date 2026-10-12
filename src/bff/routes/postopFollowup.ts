/**
 * 健澜科技 jlmedaios - 术后镇痛随访 BFF 路由（M31-C）
 * /api/v1/postop-followups。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { scheduleView, listView, completeView, FollowupError } from '../aggregators/postopFollowupAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}
function mapError(err: unknown): Response {
  if (err instanceof FollowupError) {
    const code = err.status === 404 ? ErrorCode.NOT_FOUND
      : err.status === 403 ? ErrorCode.FORBIDDEN : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '随访失败'), 500);
}
function guarded<T>(fn: (c: Ctx, view: AuthView) => Promise<T>) {
  return async (c: Ctx): Promise<Response> => {
    const denied = requirePermissionCode(c, 'postop_followup:view');
    if (denied) return denied;
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
    try { return json(ok(await fn(c, view))); } catch (e) { return mapError(e); }
  };
}

export const postopFollowupRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/postop-followups/schedule',
    handle: guarded(async (c, view) => {
      const b = await c.body<{ visitId: string; surgeryEndAt: string }>();
      return scheduleView(view, b.visitId, b.surgeryEndAt);
    }),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/postop-followups/complete',
    handle: guarded(async (c, view) => {
      const b = await c.body<{ visitId: string; timepoint: string; score: number }>();
      return completeView(view, b.visitId, b.timepoint, b.score);
    }),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/postop-followups',
    handle: guarded((c, view) => listView(view, c.query.get('visitId') ?? '')),
    auth: true,
  },
];
