/**
 * 健澜科技 jlmedaios - Barthel ADL BFF 路由（M35-B）
 * /api/v1/barthel。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { recordBarthelView, listBarthelView, BarthelError } from '../aggregators/barthelAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}
function mapError(err: unknown): Response {
  if (err instanceof BarthelError) {
    const code = err.status === 404 ? ErrorCode.NOT_FOUND
      : err.status === 403 ? ErrorCode.FORBIDDEN : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : 'Barthel 评定失败'), 500);
}
function guarded<T>(fn: (c: Ctx, view: AuthView) => Promise<T>) {
  return async (c: Ctx): Promise<Response> => {
    const denied = requirePermissionCode(c, 'barthel:view');
    if (denied) return denied;
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
    try { return json(ok(await fn(c, view))); } catch (e) { return mapError(e); }
  };
}

export const barthelRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/barthel',
    handle: guarded(async (c, view) => {
      const b = await c.body<{
        visitId: string; note?: string | null;
        feeding: number; bathing: number; grooming: number; dressing: number;
        bowel: number; bladder: number; toileting: number;
        transfer: number; walking: number; stairs: number;
      }>();
      return recordBarthelView(view, b);
    }),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/barthel',
    handle: guarded((c, view) => listBarthelView(view, c.query.get('visitId') ?? '')),
    auth: true,
  },
];
