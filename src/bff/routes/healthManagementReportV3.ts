/**
 * 健澜科技 jlmedaios - 健康管理 V3 路由（M206-B）
 *
 * GET /api/v1/health-management/report-v3
 *
 * 权限：health_management:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildHealthManagementReportV3 } from '../aggregators/healthManagementReportV3Aggregator.js';

export const healthManagementReportV3Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/health-management/report-v3',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'health_management:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildHealthManagementReportV3(timeRange);
      return json(ok(result));
    },
  },
];
