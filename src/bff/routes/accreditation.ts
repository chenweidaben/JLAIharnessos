/**
 * 健澜科技 jlmedaios - 等级评审路由（M205-D）
 *
 * GET /api/v1/admin/accreditation/report
 *
 * 权限：accreditation:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildAccreditationReport } from '../aggregators/accreditationAggregator.js';

export const accreditationRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/accreditation/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'accreditation:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '1y';
      const result = buildAccreditationReport(timeRange);
      return json(ok(result));
    },
  },
];
