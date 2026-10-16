/**
 * 健澜科技 jlmedaios - 重症医学 V2 路由（M224-D）
 *
 * GET /api/v1/icu/report-v2
 *
 * 权限：icu:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildICUReportV2 } from '../aggregators/icuReportV2Aggregator.js';

export const icuReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/icu/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'icu:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildICUReportV2(timeRange);
      return json(ok(result));
    },
  },
];
