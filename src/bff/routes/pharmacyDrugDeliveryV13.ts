/**
 * 健澜科技 jlmedaios - 药品配送 V13 路由（M406-C）
 *
 * GET /api/v1/pharmacy-drug-delivery
 *
 * 权限：pharmacy-drug-delivery:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeColdChainDrugPassRateV13,
  computeDrugDeliveryTimelyRateV13,
  computeDrugStockoutRateV13,
  type PharmacyDrugDeliveryRecordV13,
} from "../aggregators/pharmacyDrugDeliveryV13Aggregator.js";

const records: PharmacyDrugDeliveryRecordV13[] = [
  { timely: 980, should: 1000, stockout: 20, purchase: 1000, coldPass: 970, coldTotal: 1000 },
  { timely: 980, should: 1000, stockout: 20, purchase: 1000, coldPass: 970, coldTotal: 1000 },
];

export const pharmacyDrugDeliveryV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/pharmacy-drug-delivery",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "pharmacy-drug-delivery:read");
      if (denied) return denied;
      return json(ok({
        drugDeliveryTimelyRate: computeDrugDeliveryTimelyRateV13(records),
        drugStockoutRate: computeDrugStockoutRateV13(records),
        coldChainDrugPassRate: computeColdChainDrugPassRateV13(records),
      }));
    },
  },
];
