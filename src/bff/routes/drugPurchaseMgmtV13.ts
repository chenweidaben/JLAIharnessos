/**
 * 健澜科技 jlmedaios - 药品采购管理 V13 路由（M455-A，药品供应与库存管理组）
 *
 * GET /api/v1/drug-purchase-mgmt
 *
 * 权限：drug-purchase-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDrugPurchasePlanCompletionRateV13,
  computeDrugPurchaseQualityQualifiedRateV13,
  computeDrugPurchaseVolumeBasedProcurementRateV13,
  type DrugPurchaseMgmtRecordV13,
} from "../aggregators/drugPurchaseMgmtV13Aggregator.js";

const records: DrugPurchaseMgmtRecordV13[] = [
  { completed: 950, totalPlan: 1000, actual: 900, agreed: 1000, qualified: 980, totalBatch: 1000 },
  { completed: 950, totalPlan: 1000, actual: 900, agreed: 1000, qualified: 980, totalBatch: 1000 },
];

export const drugPurchaseMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/drug-purchase-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "drug-purchase-mgmt:read");
      if (denied) return denied;
      return json(ok({
        drugPurchasePlanCompletionRate: computeDrugPurchasePlanCompletionRateV13(records),
        drugPurchaseVolumeBasedProcurementRate: computeDrugPurchaseVolumeBasedProcurementRateV13(records),
        drugPurchaseQualityQualifiedRate: computeDrugPurchaseQualityQualifiedRateV13(records),
      }));
    },
  },
];
