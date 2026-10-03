/* ============================================================================
 * 健澜科技杠OS - 数据湖仓 BFF 路由（M5-D）
 *
 * 真实落 PostgreSQL，去 mock：
 *  - 触发全量/增量 pipeline、单个作业重跑（data_warehouse:admin）；
 *  - 作业运行历史、数据血缘、科室/院级指标查询（data_warehouse:read）。
 *
 * 每个写操作校验权限码；统一错误信封；加工动作写审计哈希链。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  LakehouseAggregatorError,
  getDeptSummary,
  getHospitalMetrics,
  listJobRuns,
  listLineage,
  triggerJob,
  triggerPipeline,
} from '../aggregators/lakehouseAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof LakehouseAggregatorError) {
    const code =
      err.status === 404
        ? ErrorCode.NOT_FOUND
        : err.status === 403
          ? ErrorCode.FORBIDDEN
          : err.status === 409
            ? ErrorCode.CONFLICT
            : err.status === 400
              ? ErrorCode.BAD_REQUEST
              : ErrorCode.INTERNAL_ERROR;
    return json(fail(code, err.message), err.status);
  }
  const message = err instanceof Error ? err.message : '数据湖仓处理失败';
  return json(fail(ErrorCode.INTERNAL_ERROR, message), 500);
}

function guarded<T>(
  permission: string,
  fn: (c: Ctx, view: AuthView) => Promise<T>,
  render: (data: T) => Response = (d) => json(ok(d)),
) {
  return async (c: Ctx): Promise<Response> => {
    const deniedCode = requirePermissionCode(c, permission);
    if (deniedCode) return deniedCode;
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);
    try {
      const data = await fn(c, view);
      if (data instanceof Response) return data;
      return render(data);
    } catch (err) {
      return mapError(err);
    }
  };
}

export const dataWarehouseRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/data-warehouse/pipeline',
    handle: guarded('data_warehouse:admin', async (c, view) => {
      const body = (await c.body()) as { mode?: 'full' | 'incremental' };
      return triggerPipeline(view, body.mode ?? 'incremental');
    }),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/data-warehouse/jobs/:jobCode/run',
    handle: guarded('data_warehouse:admin', (c, view) =>
      triggerJob(view, c.params.jobCode as never),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/data-warehouse/runs',
    handle: guarded('data_warehouse:read', (c, view) =>
      listJobRuns(view, {
        jobCode: c.query.get('jobCode') ?? undefined,
        limit: c.query.get('limit') ? Number(c.query.get('limit')) : undefined,
      }),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/data-warehouse/lineage',
    handle: guarded('data_warehouse:read', (_c, view) => listLineage(view)),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/data-warehouse/metrics',
    handle: guarded('data_warehouse:read', (c, view) =>
      getHospitalMetrics(view, {
        from: c.query.get('from') ?? undefined,
        to: c.query.get('to') ?? undefined,
      }),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/data-warehouse/dept-summary',
    handle: guarded('data_warehouse:read', (c, view) =>
      getDeptSummary(view, {
        date: c.query.get('date') ?? undefined,
      }),
    ),
    auth: true,
  },
];
