/**
 * 健澜科技 jlmedaios - 移动医疗 V2 路由（M214-C）
 *
 * GET /api/v1/mobile-health/report-v2
 *
 * 权限：mobile_health:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildMobileHealthReportV2 } from '../aggregators/mobileHealthReportV2Aggregator.js';

export const mobileHealthReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/mobile-health/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'mobile_health:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildMobileHealthReportV2(timeRange);
      return json(ok(result));
    },
  },
];
