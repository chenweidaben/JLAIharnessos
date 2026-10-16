/**
 * 健澜科技 jlmedaios - 网络安全 V2 路由（M227-C）
 *
 * GET /api/v1/cybersecurity/report-v2
 *
 * 权限：cybersecurity:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildCybersecurityReportV2 } from '../aggregators/cybersecurityReportV2Aggregator.js';

export const cybersecurityReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/cybersecurity/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'cybersecurity:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildCybersecurityReportV2(timeRange);
      return json(ok(result));
    },
  },
];
