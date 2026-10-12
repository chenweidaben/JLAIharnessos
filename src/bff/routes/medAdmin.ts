/**
 * 健澜科技 jlmedaios - 给药三查七对 BFF 路由（M17-B）
 *
 * 真实落 PostgreSQL：PDA 给药核对执行、记录查询、NQI_MED_ERROR 指标。
 * 权限码 + 统一错误信封 + traceId。集合/静态路由在 :id 之前注册。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  MedAdminError,
  executeMed,
  listMedAdminsView,
  getMedAdminView,
  getMedErrorMetrics,
} from '../aggregators/medAdminAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof MedAdminError) {
    const code =
      err.status === 404 ? ErrorCode.NOT_FOUND
        : err.status === 409 ? ErrorCode.CONFLICT
          : err.status === 403 ? ErrorCode.FORBIDDEN
            : err.status === 400 ? ErrorCode.BAD_REQUEST
              : ErrorCode.INTERNAL_ERROR;
    return json(fail(code, err.message), err.status);
  }
  const message = err instanceof Error ? err.message : '给药处理失败';
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

export const medAdminRoutes: RouteDef[] = [
  // NQI 指标（静态集合，须在 :id 之前）
  {
    method: 'GET',
    path: '/api/v1/medication-admin/metrics',
    handle: guarded('med_admin:read', (c, view) => getMedErrorMetrics(view)),
    auth: true,
  },
  // 给药记录列表（集合，须在 :id 之前）
  {
    method: 'GET',
    path: '/api/v1/medication-admin',
    handle: guarded('med_admin:read', (c, view) =>
      listMedAdminsView(view, {
        visitId: c.query.get('visitId') ?? undefined,
        orderId: c.query.get('orderId') ?? undefined,
        status: c.query.get('status') ?? undefined,
        errorType: c.query.get('errorType') ?? undefined,
      }),
    ),
    auth: true,
  },
  // 执行给药（三查七对 + 双人核对 + 本人签名）
  {
    method: 'POST',
    path: '/api/v1/medication-admin/execute',
    handle: guarded('med_admin:execute', async (c, view) =>
      executeMed(view, await c.body<Parameters<typeof executeMed>[1]>()),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/medication-admin/:id',
    handle: guarded('med_admin:read', (c, view) => getMedAdminView(view, c.params.id)),
    auth: true,
  },
];
