/**
 * 健澜科技 jlmedaios - DevOps V2 路由（M216-C）
 *
 * GET /api/v1/devops/report-v2
 *
 * 权限：devops:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildDevOpsReportV2 } from '../aggregators/devOpsReportV2Aggregator.js';

export const devOpsReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/devops/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'devops:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildDevOpsReportV2(timeRange);
      return json(ok(result));
    },
  },
];
