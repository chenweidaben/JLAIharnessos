/**
 * 健澜科技 jlmedaios - 患者安全路由（M193-D）
 *
 * GET /api/v1/admin/patient-safety/report
 *
 * 权限：patient_safety:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildPatientSafetyReport } from '../aggregators/patientSafetyAggregator.js';

export const patientSafetyRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/patient-safety/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'patient_safety:view');
      if (denied) return denied;

      const dept = c.query.get('dept') ?? '医务处';
      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildPatientSafetyReport(dept, timeRange);
      return json(ok(result));
    },
  },
];
