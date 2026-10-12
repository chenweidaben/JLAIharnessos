/**
 * 健澜科技 jlmedaios - 整改效果回看路由（M22-E）
 * /api/v1/improvement-outcome
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  evaluateView,
  getByTaskView,
  ImprovementOutcomeError,
} from '../aggregators/improvementOutcomeAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof ImprovementOutcomeError) {
    const code =
      err.status === 404 ? ErrorCode.NOT_FOUND
        : err.status === 403 ? ErrorCode.FORBIDDEN
          : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '效果回看失败'), 500);
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

export const improvementOutcomeRoutes: RouteDef[] = [
  { method: 'POST', path: '/api/v1/improvement-outcome/evaluate/:taskId',
    handle: guarded('improvement_outcome:view', async (c, view) => evaluateView(view, c.params.taskId, await c.body<Record<string, number>>())), auth: true },
  { method: 'GET', path: '/api/v1/improvement-outcome/:taskId',
    handle: guarded('improvement_outcome:view', (c, view) => getByTaskView(view, c.params.taskId)), auth: true },
];
