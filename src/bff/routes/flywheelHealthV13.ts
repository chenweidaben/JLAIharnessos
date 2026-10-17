/**
 * 健澜科技 jlmedaios - 综合学习飞轮健康度仪表盘 V13 路由（M310-A）
 *
 * GET /api/v1/flywheel-health
 *
 * 权限：flywheel-health:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeFlywheelHealthScoreV13,
  gradeFlywheelHealthV13,
  identifyHealthRiskV13,
  type FlywheelHealthMetricsV13,
} from "../aggregators/flywheelHealthV13Aggregator.js";

const metrics: FlywheelHealthMetricsV13 = {
  adoptionRate: 70,
  closureRate: 65,
  dualSedimentRate: 60,
  milestoneRate: 75,
};

export const flywheelHealthV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/flywheel-health",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "flywheel-health:read");
      if (denied) return denied;
      const score = computeFlywheelHealthScoreV13(metrics);
      const grade = gradeFlywheelHealthV13(score);
      return json(ok({
        score,
        grade,
        risk: identifyHealthRiskV13(score, grade),
        metrics,
      }));
    },
  },
];
