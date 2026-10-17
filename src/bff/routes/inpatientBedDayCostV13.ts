/**
 * 健澜科技 jlmedaios - 住院床日成本 V13 路由（M317-B）
 *
 * GET /api/v1/inpatient-bed-day-cost?dept=
 *
 * 权限：inpatient-bed-day-cost:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeCostCompositionV13,
  computeDeptBedDayCostV13,
  flagAbnormalBedDayCostV13,
  type InpatientAdmitV13,
} from "../aggregators/inpatientBedDayCostV13Aggregator.js";

const admits: InpatientAdmitV13[] = [
  { admitId: "a1", dept: "cardio", bedDays: 5, materialCost: 1500, drugCost: 3000, examCost: 1500, otherCost: 1500 },
  { admitId: "a2", dept: "cardio", bedDays: 5, materialCost: 1500, drugCost: 3000, examCost: 1500, otherCost: 1500 },
];

export const inpatientBedDayCostV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/inpatient-bed-day-cost",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "inpatient-bed-day-cost:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const dept = url.searchParams.get("dept") ?? "cardio";
      const threshold = 2000;
      const bedDayCost = computeDeptBedDayCostV13(admits, dept);
      return json(ok({
        dept,
        threshold,
        bedDayCost,
        composition: computeCostCompositionV13(admits),
        isAbnormal: flagAbnormalBedDayCostV13(bedDayCost, threshold),
      }));
    },
  },
];
