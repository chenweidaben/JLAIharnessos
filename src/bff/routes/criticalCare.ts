/**
 * 健澜科技 jlmedaios - ICU 路由（M203-A）
 *
 * GET /api/v1/specialty/icu/report
 *
 * 权限：icu:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildCriticalCareReport } from '../aggregators/criticalCareAggregator.js';

export const criticalCareRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/specialty/icu/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'icu:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildCriticalCareReport(timeRange);
      return json(ok(result));
    },
  },
];
