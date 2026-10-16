/**
 * 健澜科技 jlmedaios - 药品供应链 V2 路由（M209-D）
 *
 * GET /api/v1/drug-supply/report-v2
 *
 * 权限：drug_supply:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildDrugSupplyReportV2 } from '../aggregators/drugSupplyReportV2Aggregator.js';

export const drugSupplyReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/drug-supply/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'drug_supply:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildDrugSupplyReportV2(timeRange);
      return json(ok(result));
    },
  },
];
