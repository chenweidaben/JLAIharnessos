/**
 * 健澜科技 jlmedaios - 病组选择路由（M23-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  evaluateView,
  getView,
  listView,
  overrideView,
  PaymentSelectionError,
} from '../aggregators/paymentSelectionAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof PaymentSelectionError) {
    const code = err.status === 404 ? ErrorCode.NOT_FOUND
      : err.status === 403 ? ErrorCode.FORBIDDEN
        : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '病组选择失败'), 500);
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

export const paymentSelectionRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/payment-selection',
    handle: guarded('payment_select:view', (c, view) => listView(view)), auth: true },
  { method: 'POST', path: '/api/v1/payment-selection/evaluate/:visitId',
    handle: guarded('payment_select:view', async (c, view) => evaluateView(view, c.params.visitId, await c.body())), auth: true },
  { method: 'GET', path: '/api/v1/payment-selection/:visitId',
    handle: guarded('payment_select:view', (c, view) => getView(view, c.params.visitId)), auth: true },
  { method: 'POST', path: '/api/v1/payment-selection/:visitId/override',
    handle: guarded('payment_select:adjust', async (c, view) => overrideView(view, c.params.visitId, await c.body())), auth: true },
];
