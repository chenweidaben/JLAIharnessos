/**
 * 健澜科技 jlmedaios - 急诊 V3 路由（M204-A）
 *
 * GET /api/v1/emergency/report-v3
 *
 * 权限：emergency:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildEmergencyReportV3 } from '../aggregators/emergencyReportV3Aggregator.js';

export const emergencyReportV3Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/emergency/report-v3',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'emergency:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildEmergencyReportV3(timeRange);
      return json(ok(result));
    },
  },
];
