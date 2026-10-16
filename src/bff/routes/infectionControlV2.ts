/**
 * 健澜科技 jlmedaios - 院感控制 V2 路由（M188-C）
 *
 * GET /api/v1/infection/control/report-v2
 *
 * 权限：infection_control:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildInfectionControlReport } from '../aggregators/infectionControlV2Aggregator.js';

export const infectionControlV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/infection/control/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'infection_control:view');
      if (denied) return denied;

      const dept = c.query.get('dept') ?? 'ICU';
      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildInfectionControlReport(dept, timeRange);
      return json(ok(result));
    },
  },
];
