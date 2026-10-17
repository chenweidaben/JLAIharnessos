/**
 * 健澜科技 jlmedaios - 药品目录 V13 路由（M406-B）
 *
 * GET /api/v1/pharmacy-drug-catalog
 *
 * 权限：pharmacy-drug-catalog:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeBasicDrugCatalogRatioV13,
  computeCentralizedProcurementDrugEquipRateV13,
  computeKeyMonitoredDrugRatioV13,
  type PharmacyDrugCatalogRecordV13,
} from "../aggregators/pharmacyDrugCatalogV13Aggregator.js";

const records: PharmacyDrugCatalogRecordV13[] = [
  { basicDrug: 300, totalCatalog: 1000, equipped: 95, shouldEquip: 100, monitored: 20 },
  { basicDrug: 300, totalCatalog: 1000, equipped: 95, shouldEquip: 100, monitored: 20 },
];

export const pharmacyDrugCatalogV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/pharmacy-drug-catalog",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "pharmacy-drug-catalog:read");
      if (denied) return denied;
      return json(ok({
        basicDrugCatalogRatio: computeBasicDrugCatalogRatioV13(records),
        centralizedProcurementDrugEquipRate: computeCentralizedProcurementDrugEquipRateV13(records),
        keyMonitoredDrugRatio: computeKeyMonitoredDrugRatioV13(records),
      }));
    },
  },
];
