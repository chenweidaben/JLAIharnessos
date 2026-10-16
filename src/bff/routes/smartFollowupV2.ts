/**
 * 健澜科技 jlmedaios - 智能随访 V2 路由（M184-B）
 *
 * GET /api/v1/followup/smart?patientId=xxx&condition=xxx
 *
 * 权限：followup:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import {
  buildSmartFollowup,
  predictFollowupRisk,
  type FollowupConditionV2,
} from '../aggregators/smartFollowupV2Aggregator.js';

export const smartFollowupV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/followup/smart',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'followup:view');
      if (denied) return denied;

      const patientId = c.query.get('patientId') ?? 'unknown';
      const condition = (c.query.get('condition') ?? 'hypertension') as FollowupConditionV2;

      const plan = buildSmartFollowup(patientId, condition);
      const risk = predictFollowupRisk(patientId, 68, 2, 0, 1);

      return json(ok({ plan, risk }));
    },
  },
];
