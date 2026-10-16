/**
 * 健澜科技 jlmedaios - 合规路由（M198-B）
 *
 * GET /api/v1/admin/compliance/report
 *
 * 权限：compliance:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildComplianceReport } from '../aggregators/complianceAggregator.js';

export const complianceRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/compliance/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'compliance:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildComplianceReport(timeRange);
      return json(ok(result));
    },
  },
];
