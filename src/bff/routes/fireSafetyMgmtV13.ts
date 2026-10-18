/**
 * 健澜科技 jlmedaios - 消防安全管理 V13 路由（M447-D，M447 收官，应急管理与安全生产管理组）
 *
 * GET /api/v1/fire-safety-mgmt
 *
 * 权限：fire-safety-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeFireSafetyFacilityIntegrityRateV13,
  computeFireSafetyFireCountV13,
  computeFireSafetyPassageClearRateV13,
  type FireSafetyMgmtRecordV13,
} from "../aggregators/fireSafetyMgmtV13Aggregator.js";

const records: FireSafetyMgmtRecordV13[] = [
  { intact: 950, totalFacility: 1000, clear: 900, totalPassage: 1000, fire: true },
  { intact: 950, totalFacility: 1000, clear: 900, totalPassage: 1000, fire: true },
];

export const fireSafetyMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/fire-safety-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "fire-safety-mgmt:read");
      if (denied) return denied;
      return json(ok({
        fireSafetyFacilityIntegrityRate: computeFireSafetyFacilityIntegrityRateV13(records),
        fireSafetyPassageClearRate: computeFireSafetyPassageClearRateV13(records),
        fireSafetyFireCount: computeFireSafetyFireCountV13(records),
      }));
    },
  },
];
