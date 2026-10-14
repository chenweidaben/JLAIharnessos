import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { listView, scanView, createView, TimelinessError } from '../aggregators/timelinessAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof TimelinessError) {
    return json(fail(err.status === 403 ? ErrorCode.FORBIDDEN : ErrorCode.BAD_REQUEST, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

export const timelinessRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/timeliness', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c); if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try { return json(ok(await listView(view))); } catch (e) { return mapError(e); }
    } },
  { method: 'POST', path: '/api/v1/timeliness/scan', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c); if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try { return json(ok(await scanView(view))); } catch (e) { return mapError(e); }
    } },
  { method: 'POST', path: '/api/v1/timeliness', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c); if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try { return json(ok(await createView(view, (await c.body()) as Record<string, unknown>))); } catch (e) { return mapError(e); }
    } },
];
