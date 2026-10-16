/**
 * 健澜科技 jlmedaios - 手术中心 V2 路由（M224-A）
 *
 * GET /api/v1/surgery/report-v2
 *
 * 权限：surgery:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildSurgeryReportV2 } from '../aggregators/surgeryReportV2Aggregator.js';

export const surgeryReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/surgery/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'surgery:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildSurgeryReportV2(timeRange);
      return json(ok(result));
    },
  },
];
