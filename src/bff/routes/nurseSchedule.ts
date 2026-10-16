/**
 * 健澜科技 jlmedaios - 护士智能排班优化路由（M184-A）
 *
 * POST /api/v1/scheduling/optimize：
 *   入参 { dept, date, staffList, patientCount }，返回排班方案。
 *
 * 权限：scheduling:optimize。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import {
  optimizeNurseSchedule,
  type NurseStaff,
} from '../aggregators/nurseScheduleOptimizer.js';

export const nurseScheduleRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/scheduling/optimize',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'scheduling:optimize');
      if (denied) return denied;

      const body = (await c.req.json().catch(() => ({}))) as {
        dept?: string;
        date?: string;
        staffList?: NurseStaff[];
        patientCount?: number;
      };

      if (!body.dept || !body.date || !Array.isArray(body.staffList)) {
        return json(ok({ error: 'missing required fields: dept, date, staffList' }), 400);
      }

      const result = optimizeNurseSchedule(
        body.dept,
        body.date,
        body.staffList,
        body.patientCount ?? 0,
      );

      return json(ok(result));
    },
  },
];
