/**
 * 健澜科技 jlmedaios - 检验中心 V2 路由（M223-A）
 *
 * GET /api/v1/laboratory/report-v2
 *
 * 权限：laboratory:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildLaboratoryReportV2 } from '../aggregators/laboratoryReportV2Aggregator.js';

export const laboratoryReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/laboratory/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'laboratory:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildLaboratoryReportV2(timeRange);
      return json(ok(result));
    },
  },
];
