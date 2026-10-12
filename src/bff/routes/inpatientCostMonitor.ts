/**
 * 健澜科技 jlmedaios - 在院费用监控路由（M22-B）
 * /api/v1/inpatient-cost-monitor
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  dischargeReviewView,
  InpatientCostError,
  listWardView,
  refreshVisitView,
} from '../aggregators/inpatientCostMonitorAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof InpatientCostError) {
    const code =
      err.status === 404 ? ErrorCode.NOT_FOUND
        : err.status === 403 ? ErrorCode.FORBIDDEN
          : err.status === 409 ? ErrorCode.CONFLICT
            : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '在院费用监控失败'), 500);
}

function guarded<T>(perm: string, fn: (c: Ctx, view: AuthView) => Promise<T>) {
  return async (c: Ctx): Promise<Response> => {
    const denied = requirePermissionCode(c, perm);
    if (denied) return denied;
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);
    try { return json(ok(await fn(c, view))); } catch (err) { return mapError(err); }
  };
}

export const inpatientCostMonitorRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/inpatient-cost-monitor',
    handle: guarded('inpatient_cost:view', (c, view) => listWardView(view)), auth: true },
  { method: 'POST', path: '/api/v1/inpatient-cost-monitor/:visitId/refresh',
    handle: guarded('inpatient_cost:view', async (c, view) => refreshVisitView(view, { visitId: c.params.visitId, ...await c.body<{ groupCode: string; accumulatedCost: number }>() })), auth: true },
  { method: 'POST', path: '/api/v1/inpatient-cost-monitor/:visitId/discharge-review',
    handle: guarded('inpatient_cost:view', (c, view) => dischargeReviewView(view, c.params.visitId)), auth: true },
];
