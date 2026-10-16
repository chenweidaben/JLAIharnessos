/**
 * 健澜科技 jlmedaios - 老年健康 V2 路由（M221-C）
 *
 * GET /api/v1/geriatrics/report-v2
 *
 * 权限：geriatrics:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildGeriatricsReportV2 } from '../aggregators/geriatricsReportV2Aggregator.js';

export const geriatricsReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/geriatrics/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'geriatrics:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildGeriatricsReportV2(timeRange);
      return json(ok(result));
    },
  },
];
