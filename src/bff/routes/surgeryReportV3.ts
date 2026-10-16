/**
 * 健澜科技 jlmedaios - 手术 V3 路由（M204-B）
 *
 * GET /api/v1/surgery/report-v3
 *
 * 权限：surgery:report:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildSurgeryReportV3 } from '../aggregators/surgeryReportV3Aggregator.js';

export const surgeryReportV3Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/surgery/report-v3',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'surgery:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildSurgeryReportV3(timeRange);
      return json(ok(result));
    },
  },
];
