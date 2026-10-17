/**
 * 健澜科技 jlmedaios - 出院随访 V13 路由（M373-D，M373 收官）
 *
 * GET /api/v1/discharge-followup
 *
 * 权限：discharge-followup:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDischargeFollowupRateV13,
  computeFollowupCompletionRateV13,
  computeFollowupPatientSatisfactionRateV13,
  type DischargeFollowupRecordV13,
} from "../aggregators/dischargeFollowupV13Aggregator.js";

const records: DischargeFollowupRecordV13[] = [
  { dischargeCount: 1000, followupCount: 800, shouldFollowupCount: 1000, completedFollowupCount: 950, satisfactionCount: 760 },
  { dischargeCount: 1000, followupCount: 800, shouldFollowupCount: 1000, completedFollowupCount: 950, satisfactionCount: 760 },
];

export const dischargeFollowupV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/discharge-followup",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "discharge-followup:read");
      if (denied) return denied;
      return json(ok({
        dischargeFollowupRate: computeDischargeFollowupRateV13(records),
        followupCompletionRate: computeFollowupCompletionRateV13(records),
        followupPatientSatisfactionRate: computeFollowupPatientSatisfactionRateV13(records),
      }));
    },
  },
];
