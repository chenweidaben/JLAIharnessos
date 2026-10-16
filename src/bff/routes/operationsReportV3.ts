/**
 * 健澜科技 jlmedaios - 运营 V3 路由（M207-A）
 *
 * GET /api/v1/operations/report-v3
 *
 * 权限：operations:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildOperationsReportV3 } from '../aggregators/operationsReportV3Aggregator.js';

export const operationsReportV3Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/operations/report-v3',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'operations:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildOperationsReportV3(timeRange);
      return json(ok(result));
    },
  },
];
