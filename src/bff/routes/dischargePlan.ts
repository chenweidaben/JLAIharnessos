/**
 * 健澜科技 jlmedaios - 出院计划 BFF 路由（M61-A）
 * /api/v1/discharge-plans
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { planView, pushView, listView, DischargePlanError } from '../aggregators/dischargePlanAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof DischargePlanError) {
    const code =
      err.status === 404 ? ErrorCode.NOT_FOUND
        : err.status === 403 ? ErrorCode.FORBIDDEN
          : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '出院计划操作失败'), 500);
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

export const dischargePlanRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/discharge-plans',
    auth: true,
    handle: guarded('discharge_plan:manage', async (c, view) => {
      const b = await c.body<{
        visitId: string; medicationSummary: string; diagnoses?: string[]; followupDepartment?: string;
      }>();
      return planView(view, b);
    }),
  },
  {
    method: 'GET',
    path: '/api/v1/discharge-plans',
    auth: true,
    handle: guarded('discharge_plan:view', async (c, view) => listView(view, c.query.get('visitId') ?? '')),
  },
  {
    method: 'POST',
    path: '/api/v1/discharge-plans/:id/push',
    auth: true,
    handle: guarded('discharge_plan:manage', async (c, view) => pushView(view, c.params.id)),
  },
];
