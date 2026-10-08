/**
 * 健澜科技 jlmedaios - 临床路径管理 BFF 路由（M15-A）
 *
 * 真实落 PostgreSQL，去 mock：路径定义/表单、可入径患者匹配、入径签名、路径项目一键下达、
 * 变异登记、退出/完成出径、质控指标。权限码 + 统一错误信封 + traceId。
 *
 * 医疗安全：AI 不自主开医嘱；标准医嘱须执行人本人电子签名；入径/退出/出径须医师签名。
 * 集合/静态路由在 :id 之前注册。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  PathwayError,
  listDefinitionsView,
  upsertDefinitionView,
  listFormsView,
  upsertFormView,
  listEligibleView,
  listEnrollmentsView,
  enrollView,
  getEnrollmentDetailView,
  executeFormItemView,
  skipFormItemView,
  recordVariationView,
  listVariationsView,
  withdrawView,
  completeView,
  getPathwayMetricsView,
} from '../aggregators/pathwayAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof PathwayError) {
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
  const message = err instanceof Error ? err.message : '临床路径管理处理失败';
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

export const pathwayRoutes: RouteDef[] = [
  // ---- 路径定义（集合，先于 :id）----
  {
    method: 'GET',
    path: '/api/v1/pathway/definitions',
    handle: guarded('pathway:read', (c, view) =>
      listDefinitionsView(view, {
        status: c.query.get('status') ?? undefined,
        icd: c.query.get('icd') ?? undefined,
      }),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/pathway/definitions',
    handle: guarded('pathway:manage', async (c, view) =>
      upsertDefinitionView(view, await c.body<Parameters<typeof upsertDefinitionView>[1]>()),
    ),
    auth: true,
  },
  // ---- 可入径患者（集合）----
  {
    method: 'GET',
    path: '/api/v1/pathway/eligible',
    handle: guarded('pathway:read', (c, view) => listEligibleView(view)),
    auth: true,
  },
  // ---- 入径列表（集合，先于 :id）----
  {
    method: 'GET',
    path: '/api/v1/pathway/enrollments',
    handle: guarded('pathway:read', (c, view) =>
      listEnrollmentsView(view, {
        status: c.query.get('status') ?? undefined,
        visitId: c.query.get('visitId') ?? undefined,
        pathwayId: c.query.get('pathwayId') ?? undefined,
      }),
    ),
    auth: true,
  },
  // ---- 入径 ----
  {
    method: 'POST',
    path: '/api/v1/pathway/enroll',
    handle: guarded('pathway:manage', async (c, view) =>
      enrollView(view, await c.body<Parameters<typeof enrollView>[1]>()),
    ),
    auth: true,
  },
  // ---- 质控指标（集合）----
  {
    method: 'GET',
    path: '/api/v1/pathway/metrics',
    handle: guarded('pathway:audit', (c, view) =>
      getPathwayMetricsView(view, {
        from: c.query.get('from') ?? '', to: c.query.get('to') ?? '',
      }),
    ),
    auth: true,
  },
  // ---- 路径表单项（集合 :id 下，先于动作）----
  {
    method: 'GET',
    path: '/api/v1/pathway/definitions/:id/forms',
    handle: guarded('pathway:read', (c, view) =>
      listFormsView(view, c.params.id, {
        stageDay: c.query.get('stageDay') ? Number(c.query.get('stageDay')) : undefined,
      }),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/pathway/definitions/:id/forms',
    handle: guarded('pathway:manage', async (c, view) =>
      upsertFormView(view, c.params.id, await c.body<Parameters<typeof upsertFormView>[2]>()),
    ),
    auth: true,
  },
  // ---- 入径详情 ----
  {
    method: 'GET',
    path: '/api/v1/pathway/enrollments/:id',
    handle: guarded('pathway:read', (c, view) => getEnrollmentDetailView(view, c.params.id)),
    auth: true,
  },
  // ---- 入径动作 ----
  {
    method: 'POST',
    path: '/api/v1/pathway/enrollments/:id/execute',
    handle: guarded('pathway:execute', async (c, view) =>
      executeFormItemView(view, c.params.id, await c.body<Parameters<typeof executeFormItemView>[2]>()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/pathway/enrollments/:id/skip',
    handle: guarded('pathway:execute', async (c, view) =>
      skipFormItemView(view, c.params.id, await c.body<Parameters<typeof skipFormItemView>[2]>()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/pathway/enrollments/:id/variation',
    handle: guarded('pathway:manage', async (c, view) =>
      recordVariationView(view, c.params.id, await c.body<Parameters<typeof recordVariationView>[2]>()),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/pathway/enrollments/:id/variations',
    handle: guarded('pathway:read', (c, view) => listVariationsView(view, c.params.id)),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/pathway/enrollments/:id/withdraw',
    handle: guarded('pathway:manage', async (c, view) =>
      withdrawView(view, c.params.id, await c.body<Parameters<typeof withdrawView>[2]>()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/pathway/enrollments/:id/complete',
    handle: guarded('pathway:manage', async (c, view) =>
      completeView(view, c.params.id, await c.body<Parameters<typeof completeView>[2]>()),
    ),
    auth: true,
  },
];
