/**
 * 健澜科技 jlmedaios - DRG 绩效 V13 路由（M356-A）
 *
 * GET /api/v1/drg-performance
 *
 * 权限：drg-performance:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeCmiValueV13,
  computeCostConsumptionIndexV13,
  computeDrgCoveredGroupsV13,
  computeTimeConsumptionIndexV13,
  type DrgPerformanceRecordV13,
} from "../aggregators/drgPerformanceV13Aggregator.js";

const records: DrgPerformanceRecordV13[] = [
  { coveredGroups: 200, cmi: 1.2, timeConsumptionIndex: 0.9, costConsumptionIndex: 0.8 },
  { coveredGroups: 300, cmi: 1.4, timeConsumptionIndex: 1.1, costConsumptionIndex: 1.2 },
];

export const drgPerformanceV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/drg-performance",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "drg-performance:read");
      if (denied) return denied;
      return json(ok({
        coveredGroups: computeDrgCoveredGroupsV13(records),
        cmi: computeCmiValueV13(records),
        timeConsumptionIndex: computeTimeConsumptionIndexV13(records),
        costConsumptionIndex: computeCostConsumptionIndexV13(records),
      }));
    },
  },
];
