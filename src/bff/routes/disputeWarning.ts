/**
 * 健澜科技 jlmedaios - 医疗纠纷预警路由（M188-D）
 *
 * GET /api/v1/dispute/warning/report
 *
 * 权限：dispute_warning:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildMedicalDisputeWarning } from '../aggregators/disputeWarningAggregator.js';

export const disputeWarningRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/dispute/warning/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'dispute_warning:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '90d';
      const result = buildMedicalDisputeWarning(timeRange);
      return json(ok(result));
    },
  },
];
