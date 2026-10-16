/**
 * 健澜科技 jlmedaios - 学科建设 V2 路由（M219-A）
 *
 * GET /api/v1/discipline/report-v2
 *
 * 权限：discipline:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildDisciplineReportV2 } from '../aggregators/disciplineReportV2Aggregator.js';

export const disciplineReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/discipline/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'discipline:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildDisciplineReportV2(timeRange);
      return json(ok(result));
    },
  },
];
