/**
 * 健澜科技 jlmedaios - 价格监控 V13 路由（M382-D，M382 收官）
 *
 * GET /api/v1/price-monitor
 *
 * 权限：price-monitor:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeMedicalServicePriceItemCountV13,
  computePriceAdjustmentCountV13,
  computePriceComplaintCountV13,
  type PriceMonitorRecordV13,
} from "../aggregators/priceMonitorV13Aggregator.js";

const records: PriceMonitorRecordV13[] = [
  { priceItemCount: 500, priceAdjustmentCount: 20, priceComplaintCount: 10 },
  { priceItemCount: 500, priceAdjustmentCount: 20, priceComplaintCount: 10 },
];

export const priceMonitorV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/price-monitor",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "price-monitor:read");
      if (denied) return denied;
      return json(ok({
        medicalServicePriceItemCount: computeMedicalServicePriceItemCountV13(records),
        priceAdjustmentCount: computePriceAdjustmentCountV13(records),
        priceComplaintCount: computePriceComplaintCountV13(records),
      }));
    },
  },
];
