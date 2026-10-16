/**
 * 健澜科技 jlmedaios - 人力资源管理路由（M191-C）
 *
 * GET /api/v1/admin/hr/report
 *
 * 权限：hr:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildHRManagementReport } from '../aggregators/hrManagementAggregator.js';

export const hrManagementRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/hr/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'hr:view');
      if (denied) return denied;

      const dept = c.query.get('dept') ?? '人事处';
      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildHRManagementReport(dept, timeRange);
      return json(ok(result));
    },
  },
];
