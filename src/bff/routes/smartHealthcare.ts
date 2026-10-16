/**
 * 健澜科技 jlmedaios - 智慧医疗路由（M195-D）
 *
 * GET /api/v1/smart-healthcare/report
 *
 * 权限：smart_healthcare:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildSmartHealthcareReport } from '../aggregators/smartHealthcareAggregator.js';

export const smartHealthcareRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/smart-healthcare/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'smart_healthcare:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildSmartHealthcareReport(timeRange);
      return json(ok(result));
    },
  },
];
