/**
 * 健澜科技 jlmedaios - 远程医疗路由（M195-B）
 *
 * GET /api/v1/telemedicine/report
 *
 * 权限：telemedicine:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildTelemedicineReport } from '../aggregators/telemedicineAggregator.js';

export const telemedicineRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/telemedicine/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'telemedicine:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildTelemedicineReport(timeRange);
      return json(ok(result));
    },
  },
];
