/**
 * 健澜科技 jlmedaios - 绩效管理路由（M189-A）
 *
 * GET /api/v1/admin/performance-management/report
 *
 * 权限：perf_mgmt:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildPerformanceManagementReport } from '../aggregators/performanceManagementAggregator.js';

export const performanceManagementRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/performance-management/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'perf_mgmt:view');
      if (denied) return denied;

      const dept = c.query.get('dept') ?? '心内科';
      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildPerformanceManagementReport(dept, timeRange);
      return json(ok(result));
    },
  },
];
