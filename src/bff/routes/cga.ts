/**
 * 健澜科技 jlmedaios - 老年综合评估 CGA BFF 路由（M56-A）
 * /api/v1/cga
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { assessView, listView, CgaError } from '../aggregators/cgaAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof CgaError) {
    const code =
      err.status === 404 ? ErrorCode.NOT_FOUND
        : err.status === 403 ? ErrorCode.FORBIDDEN
          : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : 'CGA 操作失败'), 500);
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

export const cgaRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/cga',
    auth: true,
    handle: guarded('cga:assess', async (c, view) => {
      const b = await c.body<{
        visitId: string; adlScore: number; iadlScore: number; mmseScore: number;
        fallRisk?: boolean; mnaScore: number; gdsScore: number;
      }>();
      return assessView(view, b);
    }),
  },
  {
    method: 'GET',
    path: '/api/v1/cga',
    auth: true,
    handle: guarded('cga:view', async (c, view) => listView(view, c.query.get('visitId') ?? '')),
  },
];
