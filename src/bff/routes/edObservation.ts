/**
 * 健澜科技 jlmedaios - 急诊留观路由（M74-A）
 * /api/v1/ed-observations 、 /api/v1/ed-observations?status=&patientId= 、 /api/v1/ed-observations/:id/close
 * Copyright (c) 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { closeView, listView, registerView, EdObsError } from '../aggregators/edObservationAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof EdObsError) {
    const code =
      err.status === 404 ? ErrorCode.NOT_FOUND
        : err.status === 403 ? ErrorCode.FORBIDDEN
          : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '急诊留观处理失败'), 500);
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

export const edObservationRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/ed-observations',
    auth: true,
    handle: guarded('ed_obs:register', async (c, view) => registerView(view, await c.body())),
  },
  {
    method: 'GET',
    path: '/api/v1/ed-observations',
    auth: true,
    handle: guarded('ed_obs:view', async (c, view) =>
      listView(view, { status: c.query.get('status') ?? undefined, patientId: c.query.get('patientId') ?? undefined })),
  },
  {
    method: 'POST',
    path: '/api/v1/ed-observations/:id/close',
    auth: true,
    handle: guarded('ed_obs:register', async (c, view) => {
      const body = await c.body() as { disposition?: string };
      return closeView(view, c.params.id, body.disposition ?? 'discharged');
    }),
  },
];
