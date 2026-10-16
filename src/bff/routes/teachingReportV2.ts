/**
 * 健澜科技 jlmedaios - 教学培训 V2 路由（M219-D）
 *
 * GET /api/v1/teaching/report-v2
 *
 * 权限：teaching:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildTeachingReportV2 } from '../aggregators/teachingReportV2Aggregator.js';

export const teachingReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/teaching/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'teaching:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildTeachingReportV2(timeRange);
      return json(ok(result));
    },
  },
];
