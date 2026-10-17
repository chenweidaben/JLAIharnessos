/**
 * 健澜科技 jlmedaios - 安全管理 V13 路由（M362-D，M362 收官）
 *
 * GET /api/v1/safety-mgmt
 *
 * 权限：safety-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeFireDrillCountV13,
  computeHazardRectificationRateV13,
  computeSafetyAccidentCountV13,
  type SafetyMgmtRecordV13,
} from "../aggregators/safetyMgmtV13Aggregator.js";

const records: SafetyMgmtRecordV13[] = [
  { accidentCount: 1, fireDrillCount: 2, hazardRectified: 480, hazardInspected: 500 },
  { accidentCount: 1, fireDrillCount: 2, hazardRectified: 470, hazardInspected: 500 },
];

export const safetyMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/safety-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "safety-mgmt:read");
      if (denied) return denied;
      return json(ok({
        accidentCount: computeSafetyAccidentCountV13(records),
        fireDrillCount: computeFireDrillCountV13(records),
        hazardRectificationRate: computeHazardRectificationRateV13(records),
      }));
    },
  },
];
