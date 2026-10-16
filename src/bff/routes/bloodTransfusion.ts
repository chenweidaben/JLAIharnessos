/**
 * 健澜科技 jlmedaios - 输血管理路由（M190-B）
 *
 * GET /api/v1/blood/transfusion/report
 *
 * 权限：blood_transfusion:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildBloodTransfusionReport } from '../aggregators/bloodTransfusionAggregator.js';

export const bloodTransfusionRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/blood/transfusion/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'blood_transfusion:view');
      if (denied) return denied;

      const dept = c.query.get('dept') ?? '输血科';
      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildBloodTransfusionReport(dept, timeRange);
      return json(ok(result));
    },
  },
];
