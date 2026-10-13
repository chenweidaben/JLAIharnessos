/**
 * 健澜科技 jlmedaios - 康复治疗执行 BFF 路由（M51-A）
 * /api/v1/rehab-treatments
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  prescribeView, signView, completeView, listView, RehabTreatmentError,
} from '../aggregators/rehabTreatmentAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof RehabTreatmentError) {
    const code =
      err.status === 404 ? ErrorCode.NOT_FOUND
        : err.status === 403 ? ErrorCode.FORBIDDEN
          : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '康复治疗操作失败'), 500);
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

export const rehabTreatmentRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/rehab-treatments',
    auth: true,
    handle: guarded('rehab_treatment:manage', async (c, view) => {
      const b = await c.body<{ visitId: string; modality: string; scheduledDate: string; note?: string | null }>();
      return prescribeView(view, b);
    }),
  },
  {
    method: 'GET',
    path: '/api/v1/rehab-treatments',
    auth: true,
    handle: guarded('rehab_treatment:view', async (c, view) => listView(view, c.query.get('visitId') ?? '')),
  },
  {
    method: 'PATCH',
    path: '/api/v1/rehab-treatments/:id/sign',
    auth: true,
    handle: guarded('rehab_treatment:manage', async (c, view) => signView(view, c.params.id)),
  },
  {
    method: 'POST',
    path: '/api/v1/rehab-treatments/:id/complete',
    auth: true,
    handle: guarded('rehab_treatment:manage', async (c, view) => {
      const b = await c.body<{ efficacy: string; note?: string | null }>();
      return completeView(view, c.params.id, b);
    }),
  },
];
