/**
 * 健澜科技 jlmedaios - 住院管理 V2 路由（M225-B）
 *
 * GET /api/v1/inpatient/report-v2
 *
 * 权限：inpatient:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildInpatientReportV2 } from '../aggregators/inpatientReportV2Aggregator.js';

export const inpatientReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/inpatient/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'inpatient:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildInpatientReportV2(timeRange);
      return json(ok(result));
    },
  },
];
