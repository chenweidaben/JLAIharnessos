/**
 * 健澜科技 jlmedaios - 患者满意度路由（M63-A）
 * /api/v1/satisfaction-surveys
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  listSurveyView, rankingView, submitSurveyView, SurveyError,
} from '../aggregators/satisfactionSurveyAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof SurveyError) {
    const code =
      err.status === 404 ? ErrorCode.NOT_FOUND
        : err.status === 403 ? ErrorCode.FORBIDDEN
          : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '满意度操作失败'), 500);
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

export const satisfactionSurveyRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/satisfaction-surveys',
    auth: true,
    handle: guarded('satisfaction:submit', async (c, view) => submitSurveyView(view, await c.body())),
  },
  {
    method: 'GET',
    path: '/api/v1/satisfaction-surveys/ranking',
    auth: true,
    handle: guarded('satisfaction:view', async (_c, view) => rankingView(view)),
  },
  {
    method: 'GET',
    path: '/api/v1/satisfaction-surveys',
    auth: true,
    handle: guarded('satisfaction:view', async (c, view) => listSurveyView(view, c.query.get('visitId') ?? '')),
  },
];
