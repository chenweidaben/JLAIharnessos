/**
 * 健澜科技 jlmedaios - 药品库存管理 V13 路由（M455-B，药品供应与库存管理组）
 *
 * GET /api/v1/drug-inventory-mgmt
 *
 * 权限：drug-inventory-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDrugInventoryStockoutRateV13,
  computeDrugInventoryTurnoverComplianceRateV13,
  computeDrugInventoryTurnoverRateV13,
  type DrugInventoryMgmtRecordV13,
} from "../aggregators/drugInventoryMgmtV13Aggregator.js";

const records: DrugInventoryMgmtRecordV13[] = [
  { outbound: 950, avgInventory: 1000, qualified: 900, totalItem: 1000, stockout: 30 },
  { outbound: 950, avgInventory: 1000, qualified: 900, totalItem: 1000, stockout: 30 },
];

export const drugInventoryMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/drug-inventory-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "drug-inventory-mgmt:read");
      if (denied) return denied;
      return json(ok({
        drugInventoryTurnoverRate: computeDrugInventoryTurnoverRateV13(records),
        drugInventoryTurnoverComplianceRate: computeDrugInventoryTurnoverComplianceRateV13(records),
        drugInventoryStockoutRate: computeDrugInventoryStockoutRateV13(records),
      }));
    },
  },
];
