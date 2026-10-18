/**
 * 健澜科技 jlmedaios - 药品效期管理 V13 路由（M455-C，药品供应与库存管理组）
 *
 * GET /api/v1/drug-expiry-mgmt
 *
 * 权限：drug-expiry-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDrugExpiryInspectionCoverageRateV13,
  computeDrugExpiryNearExpiryWarningRateV13,
  computeDrugExpiryOverdueWriteOffRateV13,
  type DrugExpiryMgmtRecordV13,
} from "../aggregators/drugExpiryMgmtV13Aggregator.js";

const records: DrugExpiryMgmtRecordV13[] = [
  { warned: 950, totalNearExpiry: 1000, overdue: 30, totalDrug: 1000, inspected: 900, totalInspect: 1000 },
  { warned: 950, totalNearExpiry: 1000, overdue: 30, totalDrug: 1000, inspected: 900, totalInspect: 1000 },
];

export const drugExpiryMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/drug-expiry-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "drug-expiry-mgmt:read");
      if (denied) return denied;
      return json(ok({
        drugExpiryNearExpiryWarningRate: computeDrugExpiryNearExpiryWarningRateV13(records),
        drugExpiryOverdueWriteOffRate: computeDrugExpiryOverdueWriteOffRateV13(records),
        drugExpiryInspectionCoverageRate: computeDrugExpiryInspectionCoverageRateV13(records),
      }));
    },
  },
];
