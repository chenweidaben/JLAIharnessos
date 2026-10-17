/**
 * 健澜科技 jlmedaios - 输血率 V13 路由（M342-A）
 *
 * GET /api/v1/blood-transfusion
 *
 * 权限：blood-transfusion:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeTransfusionRatePer1000V13,
  type BloodTransfusionRecordV13,
} from "../aggregators/bloodTransfusionV13Aggregator.js";

const records: BloodTransfusionRecordV13[] = [
  { inpatientCount: 1000, transfusionCount: 50 },
];

export const bloodTransfusionV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/blood-transfusion",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "blood-transfusion:read");
      if (denied) return denied;
      return json(ok({
        transfusionRatePer1000: computeTransfusionRatePer1000V13(records),
      }));
    },
  },
];
