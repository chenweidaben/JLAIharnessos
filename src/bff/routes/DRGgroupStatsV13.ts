/**
 * 健澜科技 jlmedaios - DRG分组统计 V13 路由（M382-C，stats 避让）
 *
 * GET /api/v1/drg-group-stats
 *
 * 权限：drg-group-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDRGAvgWeightV13,
  computeDRGCaseCountV13,
  computeDRGCostDeviationRateV13,
  type DRGgroupRecordV13,
} from "../aggregators/DRGgroupStatsV13Aggregator.js";

const records: DRGgroupRecordV13[] = [
  { caseCount: 200, totalWeight: 300, actualCost: 1100, standardCost: 1000 },
  { caseCount: 200, totalWeight: 300, actualCost: 1100, standardCost: 1000 },
];

export const DRGgroupStatsV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/drg-group-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "drg-group-stats:read");
      if (denied) return denied;
      return json(ok({
        drgCaseCount: computeDRGCaseCountV13(records),
        drgAvgWeight: computeDRGAvgWeightV13(records),
        drgCostDeviationRate: computeDRGCostDeviationRateV13(records),
      }));
    },
  },
];
