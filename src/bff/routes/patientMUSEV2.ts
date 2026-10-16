/**
 * 健澜科技 jlmedaios - Patient MUSE V2 患者智能体路由（M186-B）
 *
 * GET /api/v1/personal-agent/patient-muse-v2?patientId=xxx
 *
 * 权限：patient_muse:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildPatientMUSE, generatePatientReminder } from '../aggregators/patientMUSEV2Aggregator.js';

export const patientMUSEV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/personal-agent/patient-muse-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'patient_muse:view');
      if (denied) return denied;

      const patientId = c.query.get('patientId') ?? 'demo-patient';
      const result = buildPatientMUSE(patientId, '2026-10-16');
      const reminder = generatePatientReminder(patientId);
      return json(ok({ ...result, reminder }));
    },
  },
];
