/**
 * 健澜科技 jlmedaios - DRG 分组 V13 路由（M334-C）
 *
 * GET /api/v1/drg-grouping
 *
 * 权限：drg-grouping:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeGroupingRateV13,
  computeHighWeightRateV13,
  computeLowWeightRateV13,
  type DRGRecordV13,
} from "../aggregators/drgGroupingV13Aggregator.js";

const records: DRGRecordV13[] = [
  { totalCases: 100, groupedCases: 95, lowWeightCases: 10, highWeightCases: 5 },
];

export const drgGroupingV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/drg-grouping",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "drg-grouping:read");
      if (denied) return denied;
      return json(ok({
        groupingRate: computeGroupingRateV13(records),
        lowWeightRate: computeLowWeightRateV13(records),
        highWeightRate: computeHighWeightRateV13(records),
      }));
    },
  },
];
