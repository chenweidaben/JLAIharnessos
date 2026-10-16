/**
 * 健澜科技 jlmedaios - SRE 路由（M197-D）
 *
 * GET /api/v1/admin/sre/report
 *
 * 权限：sre:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildSREReport } from '../aggregators/sreAggregator.js';

export const sreRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/sre/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'sre:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildSREReport(timeRange);
      return json(ok(result));
    },
  },
];
