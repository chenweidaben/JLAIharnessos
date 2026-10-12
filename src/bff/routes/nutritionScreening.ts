/**
 * 健澜科技 jlmedaios - 入院营养风险筛查 BFF 路由（M29-A）
 *
 * /api/v1/nutrition-screenings。权限码 + 统一错误信封 + traceId。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  createScreeningView,
  listScreeningsView,
  NutritionError,
} from '../aggregators/nutritionScreeningAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof NutritionError) {
    const code =
      err.status === 404 ? ErrorCode.NOT_FOUND
        : err.status === 403 ? ErrorCode.FORBIDDEN
          : err.status === 400 ? ErrorCode.BAD_REQUEST
            : ErrorCode.INTERNAL_ERROR;
    return json(fail(code, err.message), err.status);
  }
  const message = err instanceof Error ? err.message : '营养筛查处理失败';
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

export const nutritionScreeningRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/nutrition-screenings',
    handle: guarded('nutrition:screen', async (c, view) =>
      createScreeningView(view, await c.body<Parameters<typeof createScreeningView>[1]>()),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/nutrition-screenings',
    handle: guarded('nutrition:view', (c, view) =>
      listScreeningsView(view, c.query.get('visitId') ?? ''),
    ),
    auth: true,
  },
];
