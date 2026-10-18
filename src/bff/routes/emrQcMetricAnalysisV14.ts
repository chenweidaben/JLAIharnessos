/**
 * 健澜科技 jlmedaios - 质控指标分析 V14 路由（M483-D，M483 收官）
 *
 * GET /api/v1/emr-qc-metric-analysis  （read，auth:true，query 用 new URL 取 metric）返回指标分析报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildAnalysisReport } from "../aggregators/emrQcMetricAnalysisV14Aggregator.js";

const demoReports = [
  buildAnalysisReport("完整率", 95, 90),
  buildAnalysisReport("缺陷率", 5, 8),
  buildAnalysisReport("及时率", 92, 92),
];

export const emrQcMetricAnalysisV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-metric-analysis",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-metric-analysis:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const metric = url.searchParams.get("metric");
      const reports = metric ? demoReports.filter((r) => r.metricName === metric) : demoReports;
      return json(ok({ reports }));
    },
  },
];
