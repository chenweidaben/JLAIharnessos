/**
 * 健澜科技 jlmedaios - 运维管理 V2 路由（M227-D）
 *
 * GET /api/v1/ops/report-v2
 *
 * 权限：ops:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildOpsReportV2 } from '../aggregators/opsReportV2Aggregator.js';

export const opsReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/ops/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'ops:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildOpsReportV2(timeRange);
      return json(ok(result));
    },
  },
];
