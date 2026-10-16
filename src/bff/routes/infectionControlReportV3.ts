/**
 * 健澜科技 jlmedaios - 院感控制 V3 路由（M229-D）
 *
 * GET /api/v1/infection-control/report-v3
 *
 * 权限：infection-control:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildInfectionControlReportV3 } from '../aggregators/infectionControlReportV3Aggregator.js';

export const infectionControlReportV3Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/infection-control/report-v3',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'infection-control:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildInfectionControlReportV3(timeRange);
      return json(ok(result));
    },
  },
];
