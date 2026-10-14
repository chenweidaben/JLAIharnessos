/**
 * 健澜科技 jlmedaios - 质控整改闭环看板路由（215）
 *
 * GET   /api/v1/qc/rectification            看板全量列表（按 status 分列）
 * POST  /api/v1/qc/rectification            由质控 issue 新建整改任务（open）
 * PATCH /api/v1/qc/rectification/:id        状态机前推一步（open→fixed→reviewed→closed）
 *
 * 仅要求登录（auth），不新增权限码；不触碰 WebSocket。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  createView, listView, QcRectificationError, transitionView,
} from '../aggregators/qcRectificationAggregator.js';

/** DEMO_MODE 下不连 PostgreSQL，返回内存空兜底。 */
const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof QcRectificationError) {
    const code = err.status === 404 ? ErrorCode.NOT_FOUND
      : err.status === 403 ? ErrorCode.FORBIDDEN
      : err.status === 401 ? ErrorCode.UNAUTHORIZED
      : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

export const qcRectificationRoutes: RouteDef[] = [
  {
    method: 'GET', path: '/api/v1/qc/rectification', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (isDemo) return json(ok([]));
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        return json(ok(await listView(view)));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST', path: '/api/v1/qc/rectification', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        return json(ok(await createView(view, (await c.body()) as Record<string, unknown>)));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'PATCH', path: '/api/v1/qc/rectification/:id', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        const id = c.params.id;
        return json(ok(await transitionView(view, id, (await c.body()) as Record<string, unknown>)));
      } catch (e) { return mapError(e); }
    },
  },
];
