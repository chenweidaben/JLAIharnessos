/**
 * 健澜科技 jlmedaios - 护士交接班记录路由（214）
 *
 * POST /api/v1/nurse/handoff        登记交班记录（交班本）
 * GET  /api/v1/nurse/handoff?wardId= 按病区列交班记录（接班本）
 *
 * 权限复用 nursing:record；不触碰 WebSocket、不新增权限码。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { listView, recordView, NurseHandoffError } from '../aggregators/nurseHandoffAggregator.js';

/** DEMO_MODE 下不连 PostgreSQL，GET 列表返回内存空兜底。 */
const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof NurseHandoffError) {
    const code = err.status === 403 ? ErrorCode.FORBIDDEN : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

export const nurseHandoffRoutes: RouteDef[] = [
  {
    method: 'GET', path: '/api/v1/nurse/handoff', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (isDemo) return json(ok([]));
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        return json(ok(await listView(view, c.query.get('wardId') ?? '')));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST', path: '/api/v1/nurse/handoff', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        return json(ok(await recordView(view, (await c.body()) as Record<string, unknown>)));
      } catch (e) { return mapError(e); }
    },
  },
];
