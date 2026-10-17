/**
 * 健澜科技 jlmedaios - 医院 AI 学习飞轮成熟度 V13 路由（M306-A）
 *
 * GET /api/v1/flywheel-score
 *
 * 权限：flywheel-score:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeFlywheelScoreV13,
  gradeFlywheelV13,
  identifyFlywheelBottleneckV13,
  type FlywheelMetricsV13,
} from "../aggregators/flywheelScoreV13Aggregator.js";

const metrics: FlywheelMetricsV13 = {
  qualityScore: 70,
  adoptionRate: 80,
  feedbackLoopRate: 60,
  pushCtr: 50,
  crossDeptDiffusionRate: 40,
  assetHealthScore: 59,
};

export const flywheelScoreV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/flywheel-score",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "flywheel-score:read");
      if (denied) return denied;
      const score = computeFlywheelScoreV13(metrics);
      return json(ok({
        score,
        grade: gradeFlywheelV13(score),
        bottleneck: identifyFlywheelBottleneckV13(metrics),
        metrics,
      }));
    },
  },
];
