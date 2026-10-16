/**
 * 健澜科技 jlmedaios - 患者安全 V2 路由（M209-A）
 *
 * GET /api/v1/patient-safety/report-v2
 *
 * 权限：patient_safety:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildPatientSafetyReportV2 } from '../aggregators/patientSafetyReportV2Aggregator.js';

export const patientSafetyReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/patient-safety/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'patient_safety:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildPatientSafetyReportV2(timeRange);
      return json(ok(result));
    },
  },
];
