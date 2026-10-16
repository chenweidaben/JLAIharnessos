/**
 * 健澜科技 jlmedaios - 审计管理路由（M217-C）
 *
 * GET /api/v1/audit/report
 *
 * 权限：audit:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildAuditReport } from '../aggregators/auditReportAggregator.js';

export const auditReportRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/audit/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'audit:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildAuditReport(timeRange);
      return json(ok(result));
    },
  },
];
