/**
 * 健澜科技 jlmedaios - 值班管理 V13 路由（M402-B）
 *
 * GET /api/v1/duty-roster
 *
 * 权限：duty-roster:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDutyPresenceRateV13,
  computeNightDutyCoverageRateV13,
  computeShiftSwapApprovalRateV13,
  type DutyRosterRecordV13,
} from "../aggregators/dutyRosterV13Aggregator.js";

const records: DutyRosterRecordV13[] = [
  { present: 980, total: 1000, approvedSwap: 950, totalSwap: 1000, nightActual: 90, nightTotal: 100 },
  { present: 980, total: 1000, approvedSwap: 950, totalSwap: 1000, nightActual: 90, nightTotal: 100 },
];

export const dutyRosterV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/duty-roster",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "duty-roster:read");
      if (denied) return denied;
      return json(ok({
        dutyPresenceRate: computeDutyPresenceRateV13(records),
        shiftSwapApprovalRate: computeShiftSwapApprovalRateV13(records),
        nightDutyCoverageRate: computeNightDutyCoverageRateV13(records),
      }));
    },
  },
];
