/**
 * 健澜科技 jlmedaios - 院感 V2 路由（M209-B）
 *
 * GET /api/v1/infection-control/report-v2
 *
 * 权限：infection_control:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildInfectionControlReportV2 } from '../aggregators/infectionControlReportV2Aggregator.js';

export const infectionControlReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/infection-control/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'infection_control:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildInfectionControlReportV2(timeRange);
      return json(ok(result));
    },
  },
];
