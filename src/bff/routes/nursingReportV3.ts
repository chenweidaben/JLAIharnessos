/**
 * 健澜科技 jlmedaios - 护理 V3 路由（M205-A）
 *
 * GET /api/v1/nursing/report-v3
 *
 * 权限：nursing:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildNursingReportV3 } from '../aggregators/nursingReportV3Aggregator.js';

export const nursingReportV3Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/nursing/report-v3',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'nursing:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildNursingReportV3(timeRange);
      return json(ok(result));
    },
  },
];
