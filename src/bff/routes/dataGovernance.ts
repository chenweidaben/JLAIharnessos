/* ============================================================================
 * 健澜科技杠OS - 数据治理 BFF 路由（M5-E）
 *
 * 真实落 PostgreSQL，去 mock：
 *  - 质量检测触发、评分/趋势/结果/规则查询；
 *  - 隐私分级自动扫描、台账查询、人工修正。
 *
 * 每个写操作校验权限码；统一错误信封；检测/修正动作写审计哈希链。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  DataGovernanceError,
  getLatestRun,
  getQualityTrend,
  getRunResults,
  listClassification,
  listRules,
  overrideClassification,
  runQualityCheck,
  scanClassification,
} from '../aggregators/dataGovernanceAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown, c: Ctx): Response {
  if (err instanceof DataGovernanceError) {
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
    return json(fail(code, err.message, c.traceId), err.status);
  }
  const message = err instanceof Error ? err.message : '数据治理处理失败';
  return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
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
      return mapError(err, c);
    }
  };
}

export const dataGovernanceRoutes: RouteDef[] = [
  // ---------- 质量检测 ----------
  {
    method: 'POST',
    path: '/api/v1/data-governance/quality/run',
    handle: guarded('data_governance:admin', (_c, view) => runQualityCheck(view)),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/data-governance/quality/latest',
    handle: guarded('data_governance:read', (_c, view) => getLatestRun(view)),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/data-governance/quality/trend',
    handle: guarded('data_governance:read', (c, view) =>
      getQualityTrend(
        view,
        c.query.get('limit') ? Number(c.query.get('limit')) : 10,
      )),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/data-governance/quality/results',
    handle: guarded('data_governance:read', (c, view) =>
      getRunResults(view, c.query.get('runId') ?? undefined)),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/data-governance/rules',
    handle: guarded('data_governance:read', (_c, view) => listRules(view)),
    auth: true,
  },
  // ---------- 隐私分级 ----------
  {
    method: 'POST',
    path: '/api/v1/data-governance/classification/scan',
    handle: guarded('data_governance:admin', (_c, view) => scanClassification(view)),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/data-governance/classification',
    handle: guarded('data_governance:read', (c, view) =>
      listClassification(view, {
        schema: c.query.get('schema') ?? undefined,
        level: c.query.get('level') ? Number(c.query.get('level')) : undefined,
      })),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/data-governance/classification/override',
    handle: guarded('data_governance:admin', async (c, view) => {
      const body = (await c.body()) as {
        schemaName?: string;
        tableName?: string;
        columnName?: string;
        level?: number;
        reason?: string;
      };
      return overrideClassification(view, {
        schemaName: String(body.schemaName ?? ''),
        tableName: String(body.tableName ?? ''),
        columnName: String(body.columnName ?? ''),
        level: Number(body.level),
        reason: body.reason,
      });
    }),
    auth: true,
  },
];
