/**
 * 健澜科技 jlmedaios - 输血管理 V13 路由（M360-D，M360 收官）
 *
 * GET /api/v1/blood-mgmt
 *
 * 权限：blood-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAutologousTransfusionRateV13,
  computeBloodRequestRationalRateV13,
  computeBloodTransfusionReactionRateV13,
  type BloodMgmtRecordV13,
} from "../aggregators/bloodMgmtV13Aggregator.js";

const records: BloodMgmtRecordV13[] = [
  { reactionCount: 1, transfusionCount: 1000, autologousTransfusion: 100, transfusionTotal: 1000, requestRational: 950, requestCount: 1000 },
  { reactionCount: 1, transfusionCount: 1000, autologousTransfusion: 100, transfusionTotal: 1000, requestRational: 940, requestCount: 1000 },
];

export const bloodMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/blood-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "blood-mgmt:read");
      if (denied) return denied;
      return json(ok({
        transfusionReactionRate: computeBloodTransfusionReactionRateV13(records),
        autologousTransfusionRate: computeAutologousTransfusionRateV13(records),
        bloodRequestRationalRate: computeBloodRequestRationalRateV13(records),
      }));
    },
  },
];
