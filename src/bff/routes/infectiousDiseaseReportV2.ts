/**
 * 健澜科技 jlmedaios - 传染病防控 V2 路由（M221-A）
 *
 * GET /api/v1/infectious-disease/report-v2
 *
 * 权限：infectious_disease:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildInfectiousDiseaseReportV2 } from '../aggregators/infectiousDiseaseReportV2Aggregator.js';

export const infectiousDiseaseReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/infectious-disease/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'infectious_disease:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildInfectiousDiseaseReportV2(timeRange);
      return json(ok(result));
    },
  },
];
