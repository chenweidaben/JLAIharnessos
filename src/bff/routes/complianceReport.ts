/**
 * 健澜科技 jlmedaios - 合规管理路由（M217-B）
 *
 * GET /api/v1/compliance/report
 *
 * 权限：compliance:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildComplianceReport } from '../aggregators/complianceReportAggregator.js';

export const complianceReportRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/compliance/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'compliance:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildComplianceReport(timeRange);
      return json(ok(result));
    },
  },
];
