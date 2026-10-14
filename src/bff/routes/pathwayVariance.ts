/**
 * 健澜科技 jlmedaios - 临床路径变异管理 BFF 路由（213）
 *
 * POST /api/v1/pathway/variance            就诊级变异登记
 * GET  /api/v1/pathway/variance?visitId=   变异原因列表 + 变异率统计
 *
 * 权限码复用 pathway:read（聚合器内 pathway:variance 未下发时的回退）。
 * 统一错误信封 + traceId；集合静态路由，与 /pathway/enrollments/:id/* 无冲突。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { PathwayError } from '../aggregators/pathwayAggregator';
import {
  listView,
  recordView,
} from '../aggregators/pathwayVarianceAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof PathwayError) {
    const code =
      err.status === 404
        ? ErrorCode.NOT_FOUND
        : err.status === 409
          ? ErrorCode.CONFLICT
          : err.status === 403
            ? ErrorCode.FORBIDDEN
            : err.status === 400
              ? ErrorCode.BAD_REQUEST
              : ErrorCode.INTERNAL_ERROR;
    return json(fail(code, err.message), err.status);
  }
  const message = err instanceof Error ? err.message : '临床路径变异管理处理失败';
  return json(fail(ErrorCode.INTERNAL_ERROR, message), 500);
}

function guarded<T>(
  permission: string,
  fn: (c: Ctx, view: AuthView) => Promise<T>,
) {
  return async (c: Ctx): Promise<Response> => {
    const deniedCode = requirePermissionCode(c, permission);
    if (deniedCode) return deniedCode;
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);
    try {
      const data = await fn(c, view);
      return json(ok(data));
    } catch (err) {
      return mapError(err);
    }
  };
}

export const pathwayVarianceRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/pathway/variance',
    handle: guarded('pathway:read', (c, view) =>
      listView(view, { visitId: c.query.get('visitId') ?? undefined }),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/pathway/variance',
    handle: guarded('pathway:read', async (c, view) =>
      recordView(view, await c.body<Parameters<typeof recordView>[1]>()),
    ),
    auth: true,
  },
];
