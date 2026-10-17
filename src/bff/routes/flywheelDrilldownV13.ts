/**
 * 健澜科技 jlmedaios - 六维指标明细下钻 V13 路由（M306-B）
 *
 * GET /api/v1/flywheel-drilldown?dimension=
 *
 * 权限：flywheel-drilldown:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  benchmarkVsIndustryV13,
  compareDeptDimensionV13,
  drillDownDimensionV13,
  type DeptScoreV13,
  type FlywheelMetricsV13,
} from "../aggregators/flywheelDrilldownV13Aggregator.js";

const metrics: FlywheelMetricsV13 = {
  qualityScore: 70,
  adoptionRate: 80,
  feedbackLoopRate: 60,
  pushCtr: 50,
  crossDeptDiffusionRate: 40,
  assetHealthScore: 59,
};

const deptScores: DeptScoreV13[] = [
  { deptId: "cardio", score: 75 },
  { deptId: "surgery", score: 60 },
  { deptId: "pediatrics", score: 50 },
];

export const flywheelDrilldownV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/flywheel-drilldown",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "flywheel-drilldown:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const dimension = (url.searchParams.get("dimension") ?? "qualityScore") as keyof FlywheelMetricsV13;
      const drill = drillDownDimensionV13(dimension, metrics);
      const ranked = compareDeptDimensionV13(deptScores, dimension);
      return json(ok({
        ...drill,
        deptRanking: ranked,
        benchmark: benchmarkVsIndustryV13(drill.value, 60),
      }));
    },
  },
];
