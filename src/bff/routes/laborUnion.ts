/**
 * 健澜科技 jlmedaios - 工会管理路由（M194-C）
 *
 * GET /api/v1/admin/labor-union/report
 *
 * 权限：labor_union:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildLaborUnionReport } from '../aggregators/laborUnionAggregator.js';

export const laborUnionRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/labor-union/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'labor_union:view');
      if (denied) return denied;

      const dept = c.query.get('dept') ?? '工会';
      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildLaborUnionReport(dept, timeRange);
      return json(ok(result));
    },
  },
];
