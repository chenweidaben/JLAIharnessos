/**
 * 健澜科技 jlmedaios - 移动医疗路由（M195-C）
 *
 * GET /api/v1/mobile-health/report
 *
 * 权限：mobile_health:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildMobileHealthReport } from '../aggregators/mobileHealthAggregator.js';

export const mobileHealthRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/mobile-health/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'mobile_health:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildMobileHealthReport(timeRange);
      return json(ok(result));
    },
  },
];
