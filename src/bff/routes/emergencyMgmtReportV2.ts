/**
 * 健澜科技 jlmedaios - 急诊管理 V2 路由（M225-C）
 *
 * GET /api/v1/emergency/report-v2
 *
 * 权限：emergency:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildEmergencyMgmtReportV2 } from '../aggregators/emergencyMgmtReportV2Aggregator.js';

export const emergencyMgmtReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/emergency/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'emergency:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildEmergencyMgmtReportV2(timeRange);
      return json(ok(result));
    },
  },
];
