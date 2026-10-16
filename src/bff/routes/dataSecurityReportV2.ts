/**
 * 健澜科技 jlmedaios - 数据安全 V2 路由（M217-A）
 *
 * GET /api/v1/data-security/report-v2
 *
 * 权限：data_security:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildDataSecurityReportV2 } from '../aggregators/dataSecurityReportV2Aggregator.js';

export const dataSecurityReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/data-security/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'data_security:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildDataSecurityReportV2(timeRange);
      return json(ok(result));
    },
  },
];
