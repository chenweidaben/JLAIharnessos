/**
 * 健澜科技 jlmedaios - 科研 V3 路由（M207-B）
 *
 * GET /api/v1/research/report-v3
 *
 * 权限：research:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildResearchReportV3 } from '../aggregators/researchReportV3Aggregator.js';

export const researchReportV3Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/research/report-v3',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'research:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '1y';
      const result = buildResearchReportV3(timeRange);
      return json(ok(result));
    },
  },
];
