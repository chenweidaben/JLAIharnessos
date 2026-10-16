/**
 * 健澜科技 jlmedaios - EMR 五级评审 V2 路由（M187-C）
 *
 * GET /api/v1/emr/grade5/assessment-v2
 *
 * 权限：emr_grade5:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildEMRGrade5Assessment } from '../aggregators/emrGrade5V2Aggregator.js';

export const emrGrade5V2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/emr/grade5/assessment-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'emr_grade5:view');
      if (denied) return denied;

      const dept = c.query.get('dept') ?? '全院';
      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildEMRGrade5Assessment(dept, timeRange);
      return json(ok(result));
    },
  },
];
