/**
 * 健澜科技 jlmedaios - 患者随访学习引擎 BFF 路由（M33）
 * /api/v1/followup/:id/plan。
 *
 * 依据宪法第四章：患者随访数据按授权访问（medmuse:view）。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  buildFollowupPlanView,
  FollowupLearningError,
} from '../aggregators/followupLearningAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof FollowupLearningError) {
    const code =
      err.status === 404
        ? ErrorCode.NOT_FOUND
        : err.status === 403
          ? ErrorCode.FORBIDDEN
          : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '随访计划失败'), 500);
}

function guarded<T>(fn: (c: Ctx, view: AuthView) => Promise<T> | T) {
  return async (c: Ctx): Promise<Response> => {
    const denied = requirePermissionCode(c, 'medmuse:view');
    if (denied) return denied;
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
    try {
      return json(ok(await fn(c, view)));
    } catch (e) {
      return mapError(e);
    }
  };
}

export const followupLearningRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/followup/:id/plan',
    handle: guarded((c, view) => {
      const diseaseType = c.query.get('diseaseType') ?? c.query.get('disease') ?? '';
      return buildFollowupPlanView(view, c.params.id, diseaseType);
    }),
    auth: true,
  },
];
