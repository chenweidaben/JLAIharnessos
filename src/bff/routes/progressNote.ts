import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { listView, createView, signView, NoteError } from '../aggregators/progressNoteAggregator.js';

/** 健澜科技：DEMO_MODE 下不连 PostgreSQL，GET 列表返回内存空兜底（shape 与真实返回一致）。 */
const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof NoteError) {
    const code = err.status === 403 ? ErrorCode.FORBIDDEN : err.status === 409 ? ErrorCode.CONFLICT : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

export const progressNoteRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/progress-notes', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (isDemo) return json(ok([]));
      const view = await requester(c); if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try { return json(ok(await listView(view, c.query.get('visitId') ?? ''))); } catch (e) { return mapError(e); }
    } },
  { method: 'POST', path: '/api/v1/progress-notes', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c); if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try { return json(ok(await createView(view, (await c.body()) as Record<string, unknown>))); } catch (e) { return mapError(e); }
    } },
  { method: 'POST', path: '/api/v1/progress-notes/:id/sign', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c); if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try { return json(ok(await signView(view, c.params.id))); } catch (e) { return mapError(e); }
    } },
];
