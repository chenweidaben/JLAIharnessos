/**
 * 健澜科技 jlmedaios - 护理 V2 路由（M212-C）
 *
 * GET /api/v1/nursing/report-v2
 *
 * 权限：nursing:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildNursingReportV2 } from '../aggregators/nursingReportV2Aggregator.js';

export const nursingReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/nursing/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'nursing:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildNursingReportV2(timeRange);
      return json(ok(result));
    },
  },
];
