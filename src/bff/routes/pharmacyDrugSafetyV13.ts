/**
 * 健澜科技 jlmedaios - 药品安全 V13 路由（M406-D，M406 收官）
 *
 * GET /api/v1/pharmacy-drug-safety
 *
 * 权限：pharmacy-drug-safety:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDrugRecallResponseTimeV13,
  computeExpiredDrugDisposalRateV13,
  computeNarcoticPsychotropicDrugAccountMatchRateV13,
  type PharmacyDrugSafetyRecordV13,
} from "../aggregators/pharmacyDrugSafetyV13Aggregator.js";

const records: PharmacyDrugSafetyRecordV13[] = [
  { recallHours: 2.5, disposed: 95, expired: 100, matched: 980, totalStock: 1000 },
  { recallHours: 2.5, disposed: 95, expired: 100, matched: 980, totalStock: 1000 },
];

export const pharmacyDrugSafetyV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/pharmacy-drug-safety",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "pharmacy-drug-safety:read");
      if (denied) return denied;
      return json(ok({
        drugRecallResponseTime: computeDrugRecallResponseTimeV13(records),
        expiredDrugDisposalRate: computeExpiredDrugDisposalRateV13(records),
        narcoticPsychotropicDrugAccountMatchRate: computeNarcoticPsychotropicDrugAccountMatchRateV13(records),
      }));
    },
  },
];
