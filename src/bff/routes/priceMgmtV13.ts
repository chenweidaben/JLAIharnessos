/**
 * 健澜科技 jlmedaios - 医疗服务价格管理 V13 路由（M445-B，医保物价与费用管理组）
 *
 * GET /api/v1/price-mgmt
 *
 * 权限：price-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computePriceAdjustmentTimelinessRateV13,
  computePriceComplaintRateV13,
  computePriceExecutionAccuracyRateV13,
  type PriceMgmtRecordV13,
} from "../aggregators/priceMgmtV13Aggregator.js";

const records: PriceMgmtRecordV13[] = [
  { accurate: 950, totalChecked: 1000, timelyAdjusted: 900, shouldAdjust: 1000, complaint: 5, totalService: 1000 },
  { accurate: 950, totalChecked: 1000, timelyAdjusted: 900, shouldAdjust: 1000, complaint: 5, totalService: 1000 },
];

export const priceMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/price-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "price-mgmt:read");
      if (denied) return denied;
      return json(ok({
        priceExecutionAccuracyRate: computePriceExecutionAccuracyRateV13(records),
        priceAdjustmentTimelinessRate: computePriceAdjustmentTimelinessRateV13(records),
        priceComplaintRate: computePriceComplaintRateV13(records),
      }));
    },
  },
];
