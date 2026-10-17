/**
 * 健澜科技 jlmedaios - 飞轮季度演进趋势 V13 路由（M306-D）
 *
 * GET /api/v1/flywheel-trend
 *
 * 权限：flywheel-trend:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildQuarterlyFlywheelTrendV13,
  computeQuarterlyGrowthV13,
  identifyFlywheelMomentumV13,
  type QuarterlyScoreV13,
} from "../aggregators/flywheelTrendV13Aggregator.js";

const quarterly: QuarterlyScoreV13[] = [
  { quarter: "Q1", score: 55 },
  { quarter: "Q2", score: 60 },
  { quarter: "Q3", score: 63.4 },
];

export const flywheelTrendV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/flywheel-trend",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "flywheel-trend:read");
      if (denied) return denied;
      const trend = buildQuarterlyFlywheelTrendV13(quarterly);
      return json(ok({
        trend,
        qoqGrowth: computeQuarterlyGrowthV13(trend[trend.length - 1].score, trend[trend.length - 2].score),
        momentum: identifyFlywheelMomentumV13(trend),
      }));
    },
  },
];
