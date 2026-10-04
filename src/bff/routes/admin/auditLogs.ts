/**
 * 健澜科技 jlmedaios - 审计日志查询 BFF 路由（M8-C）
 *
 *  - GET /api/v1/admin/audit-logs              分页列表（多条件筛选）
 *  - GET /api/v1/admin/audit-logs/overview     概览统计
 *  - GET /api/v1/admin/audit-logs/distribution 操作类型分布
 *  - GET /api/v1/admin/audit-logs/trend        近 N 天趋势
 *  - GET /api/v1/admin/audit-logs/:seq         单条详情
 *
 * 全部端点需要 system:audit:view 权限；审计日志只读。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../../types';
import {
  auditDistribution,
  auditOverview,
  auditTrend,
  getAuditLogDetail,
  queryAuditLogs,
} from '../../aggregators/auditLogAggregator';

/** 解析正整数 query 参数 */
function intParam(c: Ctx, key: string, dflt: number): number {
  const v = Number(c.query.get(key));
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : dflt;
}

export const auditLogRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/audit-logs',
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'system:audit:view');
      if (denied) return denied;
      return json(
        ok(
          await queryAuditLogs({
            actorKeyword: c.query.get('actorKeyword') ?? undefined,
            action: c.query.get('action') ?? undefined,
            resourceType: c.query.get('resourceType') ?? undefined,
            result: c.query.get('result') ?? undefined,
            riskLevel: c.query.get('riskLevel') ?? undefined,
            startTime: c.query.get('startTime') ?? undefined,
            endTime: c.query.get('endTime') ?? undefined,
            page: intParam(c, 'page', 1),
            pageSize: intParam(c, 'pageSize', 20),
          }),
        ),
      );
    },
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/admin/audit-logs/overview',
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'system:audit:view');
      if (denied) return denied;
      return json(ok(await auditOverview()));
    },
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/admin/audit-logs/distribution',
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'system:audit:view');
      if (denied) return denied;
      return json(ok(await auditDistribution()));
    },
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/admin/audit-logs/trend',
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'system:audit:view');
      if (denied) return denied;
      return json(ok(await auditTrend(intParam(c, 'days', 7))));
    },
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/admin/audit-logs/:seq',
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'system:audit:view');
      if (denied) return denied;
      const seq = Number(c.params.seq);
      if (!Number.isFinite(seq) || seq <= 0) {
        return json(fail(ErrorCode.BAD_REQUEST, '审计日志序号非法', c.traceId), 400);
      }
      const log = await getAuditLogDetail(Math.floor(seq));
      if (!log) return json(fail(ErrorCode.NOT_FOUND, '审计日志不存在', c.traceId), 404);
      return json(ok(log));
    },
    auth: true,
  },
];
