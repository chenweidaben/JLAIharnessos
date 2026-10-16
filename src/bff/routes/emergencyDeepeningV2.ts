/**
 * 健澜科技 jlmedaios - 急救体系深化 V2 路由（M222-C）
 *
 * GET /api/v1/emergency/report-v2
 *
 * 权限：emergency:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildEmergencyDeepeningV2 } from '../aggregators/emergencyDeepeningV2Aggregator.js';

export const emergencyDeepeningV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/emergency/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'emergency:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildEmergencyDeepeningV2(timeRange);
      return json(ok(result));
    },
  },
];
