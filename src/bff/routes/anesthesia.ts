/**
 * 健澜科技 jlmedaios - 麻醉管理路由（M190-C）
 *
 * GET /api/v1/anesthesia/report
 *
 * 权限：anesthesia:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildAnesthesiaReport } from '../aggregators/anesthesiaAggregator.js';

export const anesthesiaRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/anesthesia/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'anesthesia:view');
      if (denied) return denied;

      const dept = c.query.get('dept') ?? '麻醉科';
      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildAnesthesiaReport(dept, timeRange);
      return json(ok(result));
    },
  },
];
