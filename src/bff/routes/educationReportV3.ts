/**
 * 健澜科技 jlmedaios - 教学 V3 路由（M207-C）
 *
 * GET /api/v1/education/report-v3
 *
 * 权限：education:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildEducationReportV3 } from '../aggregators/educationReportV3Aggregator.js';

export const educationReportV3Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/education/report-v3',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'education:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '1y';
      const result = buildEducationReportV3(timeRange);
      return json(ok(result));
    },
  },
];
