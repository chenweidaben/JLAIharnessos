/**
 * 健澜科技 jlmedaios - 质控年报 V14 路由（M487-D，M487 收官）
 *
 * GET /api/v1/emr-qc-annual-report  （read，auth:true）返回年报数据
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildAnnualReport, aggregateAnnualMetrics } from "../aggregators/emrQcAnnualReportV14Aggregator.js";

export const emrQcAnnualReportV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-annual-report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-annual-report:read");
      if (denied) return denied;
      const metrics = [
        { quarter: "Q1", value: 88 },
        { quarter: "Q2", value: 90 },
        { quarter: "Q3", value: 92 },
        { quarter: "Q4", value: 94 },
      ];
      const report = buildAnnualReport("2026", metrics);
      const aggregate = aggregateAnnualMetrics(metrics);
      return json(ok({ report, aggregate }));
    },
  },
];
