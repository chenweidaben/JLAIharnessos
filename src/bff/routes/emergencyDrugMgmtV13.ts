/**
 * 健澜科技 jlmedaios - 急救药品管理 V13 路由（M388-D，M388 收官）
 *
 * GET /api/v1/emergency-drug-mgmt
 *
 * 权限：emergency-drug-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeEmergencyCartDrugCompletenessRateV13,
  computeEmergencyDrugInventoryAccuracyRateV13,
  computeNearExpiryDrugRatioV13,
  type EmergencyDrugMgmtRecordV13,
} from "../aggregators/emergencyDrugMgmtV13Aggregator.js";

const records: EmergencyDrugMgmtRecordV13[] = [
  { completeCount: 98, shouldCount: 100, nearExpiryCount: 5, totalCount: 100, matchedCount: 99, inventoryTotalCount: 100 },
  { completeCount: 98, shouldCount: 100, nearExpiryCount: 5, totalCount: 100, matchedCount: 99, inventoryTotalCount: 100 },
];

export const emergencyDrugMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emergency-drug-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emergency-drug-mgmt:read");
      if (denied) return denied;
      return json(ok({
        emergencyCartDrugCompletenessRate: computeEmergencyCartDrugCompletenessRateV13(records),
        nearExpiryDrugRatio: computeNearExpiryDrugRatioV13(records),
        emergencyDrugInventoryAccuracyRate: computeEmergencyDrugInventoryAccuracyRateV13(records),
      }));
    },
  },
];
