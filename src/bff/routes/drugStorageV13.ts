/**
 * 健澜科技 jlmedaios - 药库管理 V13 路由（M380-C）
 *
 * GET /api/v1/drug-storage
 *
 * 权限：drug-storage:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDrugInStockVarietyCountV13,
  computeDrugLossRateV13,
  computeInventoryTurnoverRateV13,
  type DrugStorageRecordV13,
} from "../aggregators/drugStorageV13Aggregator.js";

const records: DrugStorageRecordV13[] = [
  { inStockVarietyCount: 500, outboundAmount: 200000, avgInventoryAmount: 100000, lossAmount: 5000, totalInventoryAmount: 100000 },
  { inStockVarietyCount: 500, outboundAmount: 200000, avgInventoryAmount: 100000, lossAmount: 5000, totalInventoryAmount: 100000 },
];

export const drugStorageV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/drug-storage",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "drug-storage:read");
      if (denied) return denied;
      return json(ok({
        drugInStockVarietyCount: computeDrugInStockVarietyCountV13(records),
        inventoryTurnoverRate: computeInventoryTurnoverRateV13(records),
        drugLossRate: computeDrugLossRateV13(records),
      }));
    },
  },
];
