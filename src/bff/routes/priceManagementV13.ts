/**
 * 健澜科技 jlmedaios - 价格管理 V13 路由（M375-D，M375 收官）
 *
 * GET /api/v1/price-management
 *
 * 权限：price-management:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computePriceAdjustmentExecutionRateV13,
  computePriceComplaintCountV13,
  computePriceItemCountV13,
  type PriceManagementRecordV13,
} from "../aggregators/priceManagementV13Aggregator.js";

const records: PriceManagementRecordV13[] = [
  { priceItemCount: 100, shouldAdjustCount: 100, executedAdjustCount: 95, complaintCount: 5 },
  { priceItemCount: 100, shouldAdjustCount: 100, executedAdjustCount: 95, complaintCount: 5 },
];

export const priceManagementV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/price-management",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "price-management:read");
      if (denied) return denied;
      return json(ok({
        priceItemCount: computePriceItemCountV13(records),
        priceAdjustmentExecutionRate: computePriceAdjustmentExecutionRateV13(records),
        priceComplaintCount: computePriceComplaintCountV13(records),
      }));
    },
  },
];
