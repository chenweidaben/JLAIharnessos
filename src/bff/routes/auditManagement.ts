/**
 * 健澜科技 jlmedaios - 审计管理路由（M198-C）
 *
 * GET /api/v1/admin/audit/report
 *
 * 权限：audit:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildAuditManagementReport } from '../aggregators/auditManagementAggregator.js';

export const auditManagementRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/audit/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'audit:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildAuditManagementReport(timeRange);
      return json(ok(result));
    },
  },
];
