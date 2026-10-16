/**
 * 健澜科技 jlmedaios - 科研创新 V2 路由（M219-C）
 *
 * GET /api/v1/research/report-v2
 *
 * 权限：research:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildResearchReportV2 } from '../aggregators/researchReportV2Aggregator.js';

export const researchReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/research/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'research:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildResearchReportV2(timeRange);
      return json(ok(result));
    },
  },
];
