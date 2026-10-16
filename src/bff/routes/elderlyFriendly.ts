/**
 * 健澜科技 jlmedaios - 适老化路由（M199-C）
 *
 * GET /api/v1/admin/elderly-friendly/report
 *
 * 权限：elderly_friendly:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildElderlyFriendlyReport } from '../aggregators/elderlyFriendlyAggregator.js';

export const elderlyFriendlyRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/elderly-friendly/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'elderly_friendly:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildElderlyFriendlyReport(timeRange);
      return json(ok(result));
    },
  },
];
