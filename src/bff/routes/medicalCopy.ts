import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { createView, reviewView, completeView, listView, CopyError } from '../aggregators/medicalCopyAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof CopyError) {
    const code = err.status === 403 ? ErrorCode.FORBIDDEN : err.status === 409 ? ErrorCode.CONFLICT : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

export const medicalCopyRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/medical-copy-requests', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c); if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try { return json(ok(await listView(view, c.query.get('status') ?? ''))); } catch (e) { return mapError(e); }
    } },
  { method: 'POST', path: '/api/v1/medical-copy-requests', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c); if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try { const b = (await c.body()) as Record<string, unknown>; return json(ok(await createView(view, b))); } catch (e) { return mapError(e); }
    } },
  { method: 'POST', path: '/api/v1/medical-copy-requests/:id/review', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c); if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try { const b = (await c.body()) as Record<string, unknown>; return json(ok(await reviewView(view, c.params.id, Boolean(b.approve), b.reason ? String(b.reason) : undefined))); } catch (e) { return mapError(e); }
    } },
  { method: 'POST', path: '/api/v1/medical-copy-requests/:id/complete', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c); if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try { return json(ok(await completeView(view, c.params.id))); } catch (e) { return mapError(e); }
    } },
];
