/**
 * 健澜科技 jlmedaios - 院前急救 V13 路由（M348-B）
 *
 * GET /api/v1/pre-hospital-care
 *
 * 权限：pre-hospital-care:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  compute120DispatchCountV13,
  computeAvgArrivalMinutesV13,
  computeRescueEffectiveRateV13,
  type PreHospitalCareRecordV13,
} from "../aggregators/preHospitalCareV13Aggregator.js";

const records: PreHospitalCareRecordV13[] = [
  { dispatchCount: 50, arrivalMinutes: 10, effectiveCount: 45 },
  { dispatchCount: 50, arrivalMinutes: 14, effectiveCount: 45 },
];

export const preHospitalCareV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/pre-hospital-care",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "pre-hospital-care:read");
      if (denied) return denied;
      return json(ok({
        dispatchCount: compute120DispatchCountV13(records),
        avgArrivalMinutes: computeAvgArrivalMinutesV13(records),
        rescueEffectiveRate: computeRescueEffectiveRateV13(records),
      }));
    },
  },
];
