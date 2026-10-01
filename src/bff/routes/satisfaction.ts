/**
 * 健澜科技 jlmedaios - 满意度评价 BFF 路由（M3-O）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  SatisfactionError,
  submitMySurvey,
  submitSurveyByStaff,
  listMySurveys,
  listSurveysForStaff,
  getSurveyDetail,
  getSatisfactionStats,
} from '../aggregators/satisfactionAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof SatisfactionError) {
    const code =
      err.status === 404
        ? ErrorCode.NOT_FOUND
        : err.status === 409
          ? ErrorCode.CONFLICT
          : err.status === 403
            ? ErrorCode.FORBIDDEN
            : err.status === 400
              ? ErrorCode.BAD_REQUEST
              : ErrorCode.INTERNAL_ERROR;
    return json(fail(code, err.message), err.status);
  }
  const message = err instanceof Error ? err.message : '满意度处理失败';
  return json(fail(ErrorCode.INTERNAL_ERROR, message), 500);
}

function guarded<T>(permission: string, fn: (c: Ctx, view: AuthView) => Promise<T>) {
  return async (c: Ctx): Promise<Response> => {
    const denied = requirePermissionCode(c, permission);
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

export const satisfactionRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/satisfaction/my',
    handle: guarded('satisfaction:submit', async (c, view) =>
      submitMySurvey(view, await c.body<Parameters<typeof submitMySurvey>[1]>()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/satisfaction/staff',
    handle: guarded('satisfaction:submit', async (c, view) =>
      submitSurveyByStaff(view, await c.body<Parameters<typeof submitSurveyByStaff>[1]>()),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/satisfaction/my',
    handle: guarded('satisfaction:view', async (_c, view) => listMySurveys(view)),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/satisfaction/list',
    handle: guarded('satisfaction:view', async (c) =>
      listSurveysForStaff({
        patientId: c.query.get('patientId') ?? undefined,
        sourceType:
          (c.query.get('sourceType') as 'outpatient' | 'inpatient' | 'consultation' | null) ??
          undefined,
      }),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/satisfaction/stats',
    handle: guarded('satisfaction:view', async (c) =>
      getSatisfactionStats(
        (c.query.get('sourceType') as 'outpatient' | 'inpatient' | 'consultation' | null) ??
          undefined,
      ),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/satisfaction/:id',
    handle: guarded('satisfaction:view', async (c) => getSurveyDetail(c.params.id)),
    auth: true,
  },
];
