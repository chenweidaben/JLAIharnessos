/**
 * 健澜科技 jlmedaios - 公共卫生管理路由（M192-C）
 *
 * GET /api/v1/admin/public-health/report
 *
 * 权限：public_health:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildPublicHealthReport } from '../aggregators/publicHealthAggregator.js';

export const publicHealthRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/public-health/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'public_health:view');
      if (denied) return denied;

      const dept = c.query.get('dept') ?? '公卫科';
      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildPublicHealthReport(dept, timeRange);
      return json(ok(result));
    },
  },
];
