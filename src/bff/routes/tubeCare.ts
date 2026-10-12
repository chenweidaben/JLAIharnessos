/**
 * 健澜科技 jlmedaios - 管路护理 BFF 路由（M17-C）
 *
 * 真实落 PostgreSQL：管路置入、每日评估、拔管(planned/unplanned)、NQI 指标。
 * 权限码 + 统一错误信封 + traceId。集合/静态路由在 :id 之前注册。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  TubeCareError,
  insertTubeView,
  listTubesView,
  getTubeView,
  assessTubeView,
  removeTubeView,
  getExtubationMetrics,
} from '../aggregators/tubeCareAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof TubeCareError) {
    const code =
      err.status === 404 ? ErrorCode.NOT_FOUND
        : err.status === 409 ? ErrorCode.CONFLICT
          : err.status === 403 ? ErrorCode.FORBIDDEN
            : err.status === 400 ? ErrorCode.BAD_REQUEST
              : ErrorCode.INTERNAL_ERROR;
    return json(fail(code, err.message), err.status);
  }
  const message = err instanceof Error ? err.message : '管路护理处理失败';
  return json(fail(ErrorCode.INTERNAL_ERROR, message), 500);
}

function guarded<T>(
  permission: string,
  fn: (c: Ctx, view: AuthView) => Promise<T>,
) {
  return async (c: Ctx): Promise<Response> => {
    const deniedCode = requirePermissionCode(c, permission);
    if (deniedCode) return deniedCode;
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);
    try {
      const data = await fn(c, view);
      return json(ok(data));
    } catch (err) {
      return mapError(err);
    }
  };
}

export const tubeCareRoutes: RouteDef[] = [
  // NQI 指标（静态集合，须在 :id 之前）
  {
    method: 'GET',
    path: '/api/v1/tube-care/metrics',
    handle: guarded('tube_care:read', (c, view) => getExtubationMetrics(view)),
    auth: true,
  },
  // 管路列表（集合，须在 :id 之前）
  {
    method: 'GET',
    path: '/api/v1/tube-care',
    handle: guarded('tube_care:read', (c, view) =>
      listTubesView(view, { visitId: c.query.get('visitId') ?? undefined, status: c.query.get('status') ?? undefined }),
    ),
    auth: true,
  },
  // 置入管路
  {
    method: 'POST',
    path: '/api/v1/tube-care/insert',
    handle: guarded('tube_care:insert', async (c, view) =>
      insertTubeView(view, await c.body<Parameters<typeof insertTubeView>[1]>()),
    ),
    auth: true,
  },
  // 每日评估
  {
    method: 'POST',
    path: '/api/v1/tube-care/:id/assess',
    handle: guarded('tube_care:insert', async (c, view) =>
      assessTubeView(view, { tubeId: c.params.id, ...(await c.body<{ siteIntegrity: Parameters<typeof assessTubeView>[1]['siteIntegrity']; fixationSecure: boolean; riskNote?: string }>()) }),
    ),
    auth: true,
  },
  // 拔管
  {
    method: 'POST',
    path: '/api/v1/tube-care/:id/remove',
    handle: guarded('tube_care:remove', async (c, view) =>
      removeTubeView(view, c.params.id, await c.body<Parameters<typeof removeTubeView>[2]>()),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/tube-care/:id',
    handle: guarded('tube_care:read', (c, view) => getTubeView(view, c.params.id)),
    auth: true,
  },
];
