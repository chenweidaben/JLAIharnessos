/**
 * 健澜科技 jlmedaios - 应急管理 V2 路由（M229-A）
 *
 * GET /api/v1/emergency-mgmt/report-v2
 *
 * 权限：emergency-mgmt:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildEmergencyResponseReportV2 } from '../aggregators/emergencyResponseV2Aggregator.js';

export const emergencyResponseV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/emergency-mgmt/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'emergency-mgmt:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildEmergencyResponseReportV2(timeRange);
      return json(ok(result));
    },
  },
];
