/**
 * 健澜科技 jlmedaios - 质控季报 V14 路由（M487-C）
 *
 * GET /api/v1/emr-qc-quarterly-report  （read，auth:true）返回季报数据
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildQuarterlyReport, aggregateQuarterlyMetrics } from "../aggregators/emrQcQuarterlyReportV14Aggregator.js";

export const emrQcQuarterlyReportV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-quarterly-report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-quarterly-report:read");
      if (denied) return denied;
      const metrics = [
        { month: "7月", value: 90 },
        { month: "8月", value: 92 },
        { month: "9月", value: 94 },
      ];
      const report = buildQuarterlyReport("2026-Q3", metrics);
      const aggregate = aggregateQuarterlyMetrics(metrics);
      return json(ok({ report, aggregate }));
    },
  },
];
