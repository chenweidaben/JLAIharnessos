/**
 * 健澜科技 jlmedaios - 合理用药监测路由（M188-B）
 *
 * GET /api/v1/drug/rational/report
 *
 * 权限：drug_rational:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildRationalDrugUseReport } from '../aggregators/rationalDrugUseAggregator.js';

export const rationalDrugUseRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/drug/rational/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'drug_rational:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildRationalDrugUseReport(timeRange);
      return json(ok(result));
    },
  },
];
