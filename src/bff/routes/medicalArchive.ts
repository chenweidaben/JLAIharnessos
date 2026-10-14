import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { getView, archiveView, sealView, ArchiveError } from '../aggregators/medicalArchiveAggregator.js';

/** 健澜科技：DEMO_MODE 下不连 PostgreSQL，GET 返回内存兜底（不伪造业务数字）。 */
const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof ArchiveError) {
    const code = err.status === 404 ? ErrorCode.NOT_FOUND : err.status === 403 ? ErrorCode.FORBIDDEN : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

export const medicalArchiveRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/medical-archives', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (isDemo) return json(ok({ demo: true }));
      const view = await requester(c); if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try { return json(ok(await getView(view, c.query.get('visitId') ?? ''))); } catch (e) { return mapError(e); }
    } },
  { method: 'POST', path: '/api/v1/medical-archives', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c); if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try { const b = (await c.body()) as Record<string, unknown>; return json(ok(await archiveView(view, String(b.visitId ?? '')))); } catch (e) { return mapError(e); }
    } },
  { method: 'POST', path: '/api/v1/medical-archives/:visitId/seal', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c); if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try { const b = (await c.body()) as Record<string, unknown>; return json(ok(await sealView(view, c.params.visitId, String(b.reason ?? '')))); } catch (e) { return mapError(e); }
    } },
];
