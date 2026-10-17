/**
 * 健澜科技 jlmedaios - 用血合理率 V13 路由（M333-D）
 *
 * GET /api/v1/blood-use
 *
 * 权限：blood-use:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAutologousTransfusionRateV13,
  computeReasonableBloodUseRateV13,
  type BloodUseRecordV13,
} from "../aggregators/bloodUseV13Aggregator.js";

const records: BloodUseRecordV13[] = [
  { totalUseCount: 50, reasonableUseCount: 45, totalTransfusionCount: 50, autologousTransfusionCount: 5 },
];

export const bloodUseV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/blood-use",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "blood-use:read");
      if (denied) return denied;
      return json(ok({
        reasonableUseRate: computeReasonableBloodUseRateV13(records),
        autologousTransfusionRate: computeAutologousTransfusionRateV13(records),
      }));
    },
  },
];
