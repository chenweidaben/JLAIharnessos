/**
 * 健澜科技 jlmedaios - 消防安全明细 V13 路由（M408-C）
 *
 * GET /api/v1/fire-safety-detail
 *
 * 权限：fire-safety-detail:read。避让旧版 fireSafetyV13（M352-A）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeFireDrillCountV13,
  computeFireFacilityIntegrityRateV13,
  computeFireHazardRectificationRateV13,
  type FireSafetyDetailRecordV13,
} from "../aggregators/fireSafetyDetailV13Aggregator.js";

const records: FireSafetyDetailRecordV13[] = [
  { facilityIntact: 980, facilityTotal: 1000, drillCount: 2, hazardRectified: 95, hazardFound: 100 },
  { facilityIntact: 980, facilityTotal: 1000, drillCount: 2, hazardRectified: 95, hazardFound: 100 },
];

export const fireSafetyDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/fire-safety-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "fire-safety-detail:read");
      if (denied) return denied;
      return json(ok({
        fireFacilityIntegrityRate: computeFireFacilityIntegrityRateV13(records),
        fireDrillCount: computeFireDrillCountV13(records),
        fireHazardRectificationRate: computeFireHazardRectificationRateV13(records),
      }));
    },
  },
];
