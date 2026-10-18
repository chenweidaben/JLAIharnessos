/**
 * 健澜科技 jlmedaios - 质控周报 V14 路由（M487-B）
 *
 * GET /api/v1/emr-qc-weekly-report  （read，auth:true）返回周报数据
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildWeeklyReport, aggregateWeeklyMetrics } from "../aggregators/emrQcWeeklyReportV14Aggregator.js";

export const emrQcWeeklyReportV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-weekly-report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-weekly-report:read");
      if (denied) return denied;
      const metrics = [
        { day: "周一", value: 90 },
        { day: "周二", value: 92 },
        { day: "周三", value: 88 },
        { day: "周四", value: 95 },
        { day: "周五", value: 91 },
        { day: "周六", value: 89 },
        { day: "周日", value: 93 },
      ];
      const report = buildWeeklyReport("2026-W42", metrics);
      const aggregate = aggregateWeeklyMetrics(metrics);
      return json(ok({ report, aggregate }));
    },
  },
];
