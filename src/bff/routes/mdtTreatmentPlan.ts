/**
 * 健澜科技 jlmedaios - MDT 治疗方案路由（M67-A）
 * /api/v1/mdt-treatment-plans
 * Copyright (c) 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  confirmView, draftView, listView, TreatmentPlanError,
} from '../aggregators/mdtTreatmentPlanAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof TreatmentPlanError) {
    const code =
      err.status === 404 ? ErrorCode.NOT_FOUND
        : err.status === 403 ? ErrorCode.FORBIDDEN
          : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '治疗方案操作失败'), 500);
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

export const mdtTreatmentPlanRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/mdt-treatment-plans/:mdtId/draft',
    auth: true,
    handle: guarded('treatment_plan:manage', async (c, view) => {
      const b = await c.body<{ visitId: string; departments: string[]; conclusion: string; draft?: string }>();
      return draftView(view, { mdtConsultId: c.params.mdtId, ...b });
    }),
  },
  {
    method: 'GET',
    path: '/api/v1/mdt-treatment-plans',
    auth: true,
    handle: guarded('treatment_plan:view', async (c, view) => listView(view, c.query.get('visitId') ?? '')),
  },
  {
    method: 'POST',
    path: '/api/v1/mdt-treatment-plans/:id/confirm',
    auth: true,
    handle: guarded('treatment_plan:manage', async (c, view) => {
      const b = await c.body<{ scheduledAt: string }>();
      return confirmView(view, c.params.id, b.scheduledAt);
    }),
  },
];
