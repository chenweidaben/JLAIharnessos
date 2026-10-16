/**
 * 健澜科技 jlmedaios - 疼痛管理路由（M222-D）
 *
 * GET /api/v1/pain/report
 *
 * 权限：pain:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildPainReport } from '../aggregators/painReportAggregator.js';

export const painReportRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/pain/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'pain:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildPainReport(timeRange);
      return json(ok(result));
    },
  },
];
