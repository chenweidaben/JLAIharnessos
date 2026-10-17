/**
 * 健澜科技 jlmedaios - 飞轮改进建议 V13 路由（M306-C）
 *
 * GET /api/v1/flywheel-recommendation
 *
 * 权限：flywheel-recommendation:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  estimateImprovementV13,
  generateFlywheelRecommendationV13,
  rankRecommendationsV13,
} from "../aggregators/flywheelRecommendationV13Aggregator.js";

const bottlenecks = ["crossDeptDiffusionRate", "pushCtr", "adoptionRate"];
const currentScore = 63.4;

export const flywheelRecommendationV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/flywheel-recommendation",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "flywheel-recommendation:read");
      if (denied) return denied;
      const recs = bottlenecks.map(generateFlywheelRecommendationV13);
      const ranked = rankRecommendationsV13(recs);
      return json(ok({
        currentScore,
        recommendations: ranked.map((r) => ({
          ...r,
          projectedScore: estimateImprovementV13(currentScore, r),
        })),
      }));
    },
  },
];
