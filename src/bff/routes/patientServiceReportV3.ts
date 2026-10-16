/**
 * 健澜科技 jlmedaios - 患者服务 V3 路由（M206-A）
 *
 * GET /api/v1/patient-service/report-v3
 *
 * 权限：patient_service:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildPatientServiceReportV3 } from '../aggregators/patientServiceReportV3Aggregator.js';

export const patientServiceReportV3Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/patient-service/report-v3',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'patient_service:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildPatientServiceReportV3(timeRange);
      return json(ok(result));
    },
  },
];
