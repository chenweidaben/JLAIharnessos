/**
 * 健澜科技 jlmedaios - 手术核查表路由（M82-A）
 * /api/v1/surgical-checklist
 * Copyright (c) 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { createView, stageView, SurgicalCheckError } from '../aggregators/surgicalChecklistAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof SurgicalCheckError) {
    const code = err.status === 403 ? ErrorCode.FORBIDDEN : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '手术核查处理失败'), 500);
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

export const surgicalChecklistRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/surgical-checklist/:surgeryId',
    auth: true,
    handle: guarded('surgical_check:complete', async (c, view) => createView(view, c.params.surgeryId ?? '')),
  },
  {
    method: 'POST',
    path: '/api/v1/surgical-checklist/:id/signin',
    auth: true,
    handle: guarded('surgical_check:complete', async (c, view) => stageView(view, c.params.id ?? '', 'signin', await c.body() as Parameters<typeof stageView>[3])),
  },
  {
    method: 'POST',
    path: '/api/v1/surgical-checklist/:id/timeout',
    auth: true,
    handle: guarded('surgical_check:complete', async (c, view) => stageView(view, c.params.id ?? '', 'timeout', await c.body() as Parameters<typeof stageView>[3])),
  },
  {
    method: 'POST',
    path: '/api/v1/surgical-checklist/:id/signout',
    auth: true,
    handle: guarded('surgical_check:complete', async (c, view) => stageView(view, c.params.id ?? '', 'signout', await c.body() as Parameters<typeof stageView>[3])),
  },
];
