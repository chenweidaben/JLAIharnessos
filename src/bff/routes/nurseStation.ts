/**
 * 健澜科技 jlmedaios - 护士站四合一屏路由（M18-B）
 *
 * /api/v1/nurse-station/ward、/visit/:visitId。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { getVisitWorkbench, getWardBoard, NurseStationError } from '../aggregators/nurseStationAggregator';
import { getVisitEvaluations, EvalError } from '../aggregators/nurseStationEvalAggregator';

const PERM = 'nurse_station:read';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof NurseStationError) {
    const code =
      err.status === 404 ? ErrorCode.NOT_FOUND
        : err.status === 403 ? ErrorCode.FORBIDDEN
          : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  const message = err instanceof Error ? err.message : '护士站处理失败';
  return json(fail(ErrorCode.INTERNAL_ERROR, message), 500);
}

function guarded<T>(fn: (c: Ctx, view: AuthView) => Promise<T>) {
  return async (c: Ctx): Promise<Response> => {
    const denied = requirePermissionCode(c, PERM);
    if (denied) return denied;
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);
    try {
      return json(ok(await fn(c, view)));
    } catch (err) {
      return mapError(err);
    }
  };
}

export const nurseStationRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/nurse-station/ward',
    handle: guarded((_c, view) => getWardBoard(view, PERM)),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/nurse-station/visit/:visitId',
    handle: guarded((c, view) => getVisitWorkbench(view, PERM, c.params.visitId)),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/nurse-station/:visitId/evaluations',
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'nurse_eval:view');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try { return json(ok(await getVisitEvaluations(view, c.params.visitId))); }
      catch (e) {
        if (e instanceof EvalError) {
          const code = e.status === 404 ? ErrorCode.NOT_FOUND : ErrorCode.FORBIDDEN;
          return json(fail(code, e.message), e.status);
        }
        return json(fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : 'eval fail'), 500);
      }
    },
    auth: true,
  },
];
