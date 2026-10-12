/**
 * 健澜科技 jlmedaios - 医嘱开方 CDS BFF 路由（M18-A）
 *
 * /api/v1/order-cds。权限码 + 统一错误信封 + traceId。集合/静态在 :id 前。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  evaluateCdsView,
  listByOrderView,
  listByVisitView,
  OrderCdsError,
  overrideAlertView,
} from '../aggregators/orderCdsAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof OrderCdsError) {
    const code =
      err.status === 404 ? ErrorCode.NOT_FOUND
        : err.status === 403 ? ErrorCode.FORBIDDEN
          : err.status === 400 ? ErrorCode.BAD_REQUEST
            : err.status === 422 ? ErrorCode.CONFLICT
              : ErrorCode.INTERNAL_ERROR;
    return json(fail(code, err.message), err.status);
  }
  const message = err instanceof Error ? err.message : 'CDS 处理失败';
  return json(fail(ErrorCode.INTERNAL_ERROR, message), 500);
}

function guarded<T>(permission: string, fn: (c: Ctx, view: AuthView) => Promise<T>) {
  return async (c: Ctx): Promise<Response> => {
    const deniedCode = requirePermissionCode(c, permission);
    if (deniedCode) return deniedCode;
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);
    try {
      return json(ok(await fn(c, view)));
    } catch (err) {
      return mapError(err);
    }
  };
}

export const orderCdsRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/order-cds',
    handle: guarded('cds:read', (c, view) => listByVisitView(view, c.query.get('visitId') ?? '')),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/order-cds/evaluate',
    handle: guarded('cds:read', async (c, view) =>
      evaluateCdsView(view, await c.body<Parameters<typeof evaluateCdsView>[1]>()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/order-cds/:id/override',
    handle: guarded('cds:override', async (c, view) =>
      overrideAlertView(view, c.params.id, (await c.body<{ reason: string }>()).reason),
    ),
    auth: true,
  },
];
