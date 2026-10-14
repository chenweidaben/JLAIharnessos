/**
 * 健澜科技 jlmedaios - 危急值闭环升级路由（216）
 *
 * POST /api/v1/critical-value/:id/accept   医生接收（notified -> accepted）
 * POST /api/v1/critical-value/:id/process  记录处理时间（accepted -> processed，带处置记录）
 * POST /api/v1/critical-value/:id/close     闭环（processed -> closed）
 *
 * 仅要求登录（auth），不新增权限码；不触碰 WebSocket；前端不做新页面。
 * 统一错误信封。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  acceptClosure,
  ClosureError,
  closeClosure,
  processClosure,
} from '../aggregators/criticalValueClosureAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof ClosureError) {
    const code =
      err.status === 404
        ? ErrorCode.NOT_FOUND
        : err.status === 409
          ? ErrorCode.CONFLICT
          : err.status === 401
            ? ErrorCode.UNAUTHORIZED
            : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  const message = err instanceof Error ? err.message : '危急值闭环处理失败';
  return json(fail(ErrorCode.INTERNAL_ERROR, message), 500);
}

export const criticalValueClosureRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/critical-value/:id/accept',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);
      try {
        return json(ok(await acceptClosure(view, c.params.id)));
      } catch (e) {
        return mapError(e);
      }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/critical-value/:id/process',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);
      try {
        const body = await c.body<{ note?: string }>();
        return json(ok(await processClosure(view, c.params.id, body?.note ?? '')));
      } catch (e) {
        return mapError(e);
      }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/critical-value/:id/close',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);
      try {
        return json(ok(await closeClosure(view, c.params.id)));
      } catch (e) {
        return mapError(e);
      }
    },
  },
];
