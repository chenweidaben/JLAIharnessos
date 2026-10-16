/**
 * 健澜科技 jlmedaios - 中医路由（M202-C）
 *
 * GET /api/v1/specialty/tcm/report
 *
 * 权限：tcm:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildTCMReport } from '../aggregators/tcmAggregator.js';

export const tcmRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/specialty/tcm/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'tcm:view');
      if (denied) return denied;

      const dept = c.query.get('dept') ?? '中医科';
      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildTCMReport(dept, timeRange);
      return json(ok(result));
    },
  },
];
