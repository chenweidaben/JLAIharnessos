/**
 * 健澜科技 jlmedaios - DRG 预算路由（M22-A）
 * /api/v1/drg-budgets
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { ackAlertView, DrgBudgetError, listAlertsView, listBudgetsView, upsertBudgetView } from '../aggregators/drgBudgetAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof DrgBudgetError) {
    const code =
      err.status === 404 ? ErrorCode.NOT_FOUND
        : err.status === 403 ? ErrorCode.FORBIDDEN
          : err.status === 409 ? ErrorCode.CONFLICT
            : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : 'DRG 预算失败'), 500);
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

export const drgBudgetRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/drg-budgets',
    handle: guarded('drg_budget:view', (c, view) => listBudgetsView(view)), auth: true },
  { method: 'POST', path: '/api/v1/drg-budgets',
    handle: guarded('drg_budget:manage', async (c, view) => upsertBudgetView(view, await c.body<Parameters<typeof upsertBudgetView>[1]>())), auth: true },
  { method: 'GET', path: '/api/v1/drg-budgets/alerts',
    handle: guarded('drg_budget:view', (c, view) => listAlertsView(view, c.query.get('all') !== '1')), auth: true },
  { method: 'POST', path: '/api/v1/drg-budgets/alerts/:id/ack',
    handle: guarded('drg_budget:view', (c, view) => ackAlertView(view, c.params.id)), auth: true },
];
