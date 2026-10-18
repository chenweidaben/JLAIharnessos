/**
 * 健澜科技 jlmedaios - 质控科室趋势分析 V14 路由（M501-B）
 *
 * GET /api/v1/emr-qc-dept-trend-analysis  （read，auth:true）返回科室趋势分析
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { aggregateDeptTrend, buildDeptTrend } from "../aggregators/emrQcDeptTrendAnalysisV14Aggregator.js";

const sampleTrends = [
  buildDeptTrend("内科", [88, 90, 92]),
  buildDeptTrend("外科", [95, 90, 85]),
];

const aggregate = aggregateDeptTrend(sampleTrends);

export const emrQcDeptTrendAnalysisV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-dept-trend-analysis",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-dept-trend-analysis:read");
      if (denied) return denied;
      return json(ok({ trends: sampleTrends, aggregate }));
    },
  },
];
