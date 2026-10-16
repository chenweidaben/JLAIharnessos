/**
 * 健澜科技 jlmedaios - 健康管理 V2 路由（M222-B）
 *
 * GET /api/v1/health-management/report-v2
 *
 * 权限：health_management:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildHealthManagementReportV2 } from '../aggregators/healthManagementReportV2Aggregator.js';

export const healthManagementReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/health-management/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'health_management:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildHealthManagementReportV2(timeRange);
      return json(ok(result));
    },
  },
];
