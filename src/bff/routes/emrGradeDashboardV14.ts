/**
 * 健澜科技 jlmedaios - 电子病历等级评审仪表盘 V14 路由（M462-D，M462 收官）
 *
 * GET /api/v1/emr-grade-dashboard （read，auth:true）返回整体进度+各项+评级
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeGradeProgress,
  getGradeLevel,
  type GradeMetricsV14,
} from "../aggregators/emrGradeDashboardV14Aggregator.js";

const demoMetrics: GradeMetricsV14 = {
  structuredRate: 85,
  closedLoopRate: 78,
  sharingRate: 70,
  qcCoverageRate: 92,
};

export const emrGradeDashboardV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-grade-dashboard",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-grade-dashboard:read");
      if (denied) return denied;
      void new URL(c.req.url).searchParams.get("unused");
      const progress = computeGradeProgress(demoMetrics);
      return json(ok({
        overall: progress.overall,
        items: progress.items,
        gradeLevel: getGradeLevel(progress.overall),
      }));
    },
  },
];
