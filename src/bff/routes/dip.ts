/**
 * 健澜科技 jlmedaios - DIP 路由（M23-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  calculatePointView,
  createPacketView,
  DipError,
  listPacketsView,
  listPointsView,
  settleView,
} from '../aggregators/dipAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof DipError) {
    const code = err.status === 403 ? ErrorCode.FORBIDDEN : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : 'DIP 失败'), 500);
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

export const dipRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/dip/packets',
    handle: guarded('dip:view', (c, view) => listPacketsView(view)), auth: true },
  { method: 'POST', path: '/api/v1/dip/packets',
    handle: guarded('dip:manage', async (c, view) => createPacketView(view, await c.body())), auth: true },
  { method: 'GET', path: '/api/v1/dip/points',
    handle: guarded('dip:view', (c, view) => listPointsView(view)), auth: true },
  { method: 'POST', path: '/api/v1/dip/points/calculate',
    handle: guarded('dip:manage', async (c, view) => calculatePointView(view, await c.body())), auth: true },
  { method: 'POST', path: '/api/v1/dip/settle',
    handle: guarded('dip:view', async (c, view) => settleView(view, await c.body())), auth: true },
];
