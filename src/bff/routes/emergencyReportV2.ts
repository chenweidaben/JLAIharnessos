/**
 * 健澜科技 jlmedaios - 急诊管理路由（M190-D V2 报表层）
 *
 * GET /api/v1/emergency/report
 *
 * 权限：emergency:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildEmergencyReport } from '../aggregators/emergencyReportV2Aggregator.js';

export const emergencyReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/emergency/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'emergency:view');
      if (denied) return denied;

      const dept = c.query.get('dept') ?? '急诊科';
      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildEmergencyReport(dept, timeRange);
      return json(ok(result));
    },
  },
];
