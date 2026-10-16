/**
 * 健澜科技 jlmedaios - 消防安保 V2 路由（M229-B）
 *
 * GET /api/v1/fire-security/report-v2
 *
 * 权限：fire-security:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildFireSecurityReportV2 } from '../aggregators/fireSecurityReportV2Aggregator.js';

export const fireSecurityReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/fire-security/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'fire-security:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildFireSecurityReportV2(timeRange);
      return json(ok(result));
    },
  },
];
