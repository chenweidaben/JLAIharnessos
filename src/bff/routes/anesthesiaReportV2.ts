/**
 * 健澜科技 jlmedaios - 麻醉中心 V2 路由（M224-B）
 *
 * GET /api/v1/anesthesia/report-v2
 *
 * 权限：anesthesia:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildAnesthesiaReportV2 } from '../aggregators/anesthesiaReportV2Aggregator.js';

export const anesthesiaReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/anesthesia/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'anesthesia:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildAnesthesiaReportV2(timeRange);
      return json(ok(result));
    },
  },
];
