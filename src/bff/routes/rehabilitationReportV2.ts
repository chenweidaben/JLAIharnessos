/**
 * 健澜科技 jlmedaios - 康复医学 V2 路由（M222-A）
 *
 * GET /api/v1/rehabilitation/report-v2
 *
 * 权限：rehabilitation:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildRehabilitationReportV2 } from '../aggregators/rehabilitationReportV2Aggregator.js';

export const rehabilitationReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/rehabilitation/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'rehabilitation:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildRehabilitationReportV2(timeRange);
      return json(ok(result));
    },
  },
];
