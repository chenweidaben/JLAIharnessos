/**
 * 健澜科技 jlmedaios - 数据治理 V2 路由（M227-B）
 *
 * GET /api/v1/data-governance/report-v2
 *
 * 权限：data-governance:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildDataGovernanceReportV2 } from '../aggregators/dataGovernanceReportV2Aggregator.js';

export const dataGovernanceReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/data-governance/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'data-governance:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildDataGovernanceReportV2(timeRange);
      return json(ok(result));
    },
  },
];
