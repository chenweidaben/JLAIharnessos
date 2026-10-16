/**
 * 健澜科技 jlmedaios - 数据安全路由（M198-A）
 *
 * GET /api/v1/admin/data-security/report
 *
 * 权限：data_security:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildDataSecurityReport } from '../aggregators/dataSecurityAggregator.js';

export const dataSecurityRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/data-security/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'data_security:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildDataSecurityReport(timeRange);
      return json(ok(result));
    },
  },
];
