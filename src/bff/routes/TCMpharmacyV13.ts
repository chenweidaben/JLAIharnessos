/**
 * 健澜科技 jlmedaios - 中药房 V13 路由（M380-D，M380 收官）
 *
 * GET /api/v1/tcm-pharmacy
 *
 * 权限：tcm-pharmacy:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeTCMDecoctionCountV13,
  computeTCMHerbVarietyCountV13,
  computeTCMPrescriptionCountV13,
  type TCMpharmacyRecordV13,
} from "../aggregators/TCMpharmacyV13Aggregator.js";

const records: TCMpharmacyRecordV13[] = [
  { herbVarietyCount: 200, decoctionCount: 300, prescriptionCount: 800 },
  { herbVarietyCount: 200, decoctionCount: 300, prescriptionCount: 800 },
];

export const TCMpharmacyV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/tcm-pharmacy",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "tcm-pharmacy:read");
      if (denied) return denied;
      return json(ok({
        tcmHerbVarietyCount: computeTCMHerbVarietyCountV13(records),
        tcmDecoctionCount: computeTCMDecoctionCountV13(records),
        tcmPrescriptionCount: computeTCMPrescriptionCountV13(records),
      }));
    },
  },
];
