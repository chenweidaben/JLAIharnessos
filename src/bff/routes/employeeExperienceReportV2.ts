/**
 * 健澜科技 jlmedaios - 员工体验 V2 路由（M218-B）
 *
 * GET /api/v1/employee-experience/report-v2
 *
 * 权限：employee_experience:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildEmployeeExperienceReportV2 } from '../aggregators/employeeExperienceReportV2Aggregator.js';

export const employeeExperienceReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/employee-experience/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'employee_experience:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildEmployeeExperienceReportV2(timeRange);
      return json(ok(result));
    },
  },
];
