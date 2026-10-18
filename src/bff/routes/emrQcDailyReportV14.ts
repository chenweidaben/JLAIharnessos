/**
 * 健澜科技 jlmedaios - 质控日报 V14 路由（M487-A）
 *
 * GET /api/v1/emr-qc-daily-report  （read，auth:true）返回日报数据
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildDailyReport, aggregateDailyMetrics } from "../aggregators/emrQcDailyReportV14Aggregator.js";

export const emrQcDailyReportV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-daily-report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-daily-report:read");
      if (denied) return denied;
      const metrics = [
        { name: "甲级率", value: 95 },
        { name: "乙级率", value: 85 },
        { name: "丙级率", value: 90 },
      ];
      const report = buildDailyReport("2026-10-18", metrics);
      const aggregate = aggregateDailyMetrics(metrics);
      return json(ok({ report, aggregate }));
    },
  },
];
