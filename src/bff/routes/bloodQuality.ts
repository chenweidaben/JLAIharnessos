/**
 * 健澜科技 jlmedaios - 临床用血质量 BFF 路由（M10-B）
 *
 * 真实落 PostgreSQL，去 mock：输血疗效评估、用血合理性评价、等级评审质控指标。
 * 权限码 + 统一错误信封 + traceId。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  BloodQualityError,
  assessEfficacy,
  reviewUtilization,
  getQualityMetrics,
  listEfficacyView,
  listUtilizationView,
  getBloodQualityDetail,
} from '../aggregators/bloodQualityAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof BloodQualityError) {
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
  const message = err instanceof Error ? err.message : '用血质量处理失败';
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

export const bloodQualityRoutes: RouteDef[] = [
  // ---- 疗效评估 ----
  {
    method: 'POST',
    path: '/api/v1/blood-quality/efficacy',
    handle: guarded('blood:assess', async (c, view) =>
      assessEfficacy(view, await c.body<Parameters<typeof assessEfficacy>[1]>()),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/blood-quality/efficacy',
    handle: guarded('blood:assess', (c) =>
      listEfficacyView({ grade: c.query.get('grade') ?? undefined }),
    ),
    auth: true,
  },
  // ---- 用血合理性评价 ----
  {
    method: 'POST',
    path: '/api/v1/blood-quality/utilization',
    handle: guarded('blood:audit', async (c, view) =>
      reviewUtilization(view, await c.body<Parameters<typeof reviewUtilization>[1]>()),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/blood-quality/utilization',
    handle: guarded('blood:audit', (c) =>
      listUtilizationView({ conclusion: c.query.get('conclusion') ?? undefined }),
    ),
    auth: true,
  },
  // ---- 质控指标（须在 :requestId 之前注册）----
  {
    method: 'GET',
    path: '/api/v1/blood-quality/metrics',
    handle: guarded('blood:audit', (c, view) =>
      getQualityMetrics(view, {
        from: c.query.get('from') ?? '',
        to: c.query.get('to') ?? '',
      }),
    ),
    auth: true,
  },
  // ---- 详情 ----
  {
    method: 'GET',
    path: '/api/v1/blood-quality/:requestId',
    handle: guarded('blood:assess', (c) => getBloodQualityDetail(c.params.requestId)),
    auth: true,
  },
];
