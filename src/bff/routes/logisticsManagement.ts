/**
 * 健澜科技 jlmedaios - 后勤管理路由（M192-D）
 *
 * GET /api/v1/admin/logistics/report
 *
 * 权限：logistics:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildLogisticsManagementReport } from '../aggregators/logisticsManagementAggregator.js';

export const logisticsManagementRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/logistics/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'logistics:view');
      if (denied) return denied;

      const dept = c.query.get('dept') ?? '后勤处';
      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildLogisticsManagementReport(dept, timeRange);
      return json(ok(result));
    },
  },
];
