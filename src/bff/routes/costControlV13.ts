/**
 * 健澜科技 jlmedaios - 成本控制 V13 路由（M345-C）
 *
 * GET /api/v1/cost-control
 *
 * 权限：cost-control:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDrugRatioYoyV13,
  computeInpatientAvgCostV13,
  computeOutpatientAvgCostV13,
  type CostControlRecordV13,
} from "../aggregators/costControlV13Aggregator.js";

const records: CostControlRecordV13[] = [
  { outpatientCost: 300, inpatientCost: 8000, drugRatioCurrent: 30.5, drugRatioPrevious: 31.0 },
  { outpatientCost: 500, inpatientCost: 10000, drugRatioCurrent: 30.5, drugRatioPrevious: 31.0 },
  { outpatientCost: 400, inpatientCost: 9000, drugRatioCurrent: 30.5, drugRatioPrevious: 31.0 },
];

export const costControlV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/cost-control",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "cost-control:read");
      if (denied) return denied;
      return json(ok({
        outpatientAvgCost: computeOutpatientAvgCostV13(records),
        inpatientAvgCost: computeInpatientAvgCostV13(records),
        drugRatioYoy: computeDrugRatioYoyV13(records),
      }));
    },
  },
];
