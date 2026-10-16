/**
 * 健澜科技 jlmedaios - 门诊管理 V2 路由（M225-A）
 *
 * GET /api/v1/outpatient/report-v2
 *
 * 权限：outpatient:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildOutpatientReportV2 } from '../aggregators/outpatientReportV2Aggregator.js';

export const outpatientReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/outpatient/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'outpatient:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildOutpatientReportV2(timeRange);
      return json(ok(result));
    },
  },
];
