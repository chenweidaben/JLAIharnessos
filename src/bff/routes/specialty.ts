/**
 * 健澜科技 jlmedaios - 专科路由（M201-C）
 *
 * GET /api/v1/specialty/report?dept=xxx
 *
 * 权限：specialty:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildSpecialtyReport } from '../aggregators/specialtyAggregator.js';

export const specialtyRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/specialty/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'specialty:view');
      if (denied) return denied;

      const dept = c.query.get('dept') ?? '妇幼';
      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildSpecialtyReport(dept, timeRange);
      return json(ok(result));
    },
  },
];
