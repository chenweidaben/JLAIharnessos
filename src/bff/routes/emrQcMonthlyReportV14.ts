/**
 * 健澜科技 jlmedaios - 质控月度报表 V14 路由（M506-C）
 *
 * GET /api/v1/emr-qc-monthly-report  （read，auth:true）返回月度报表
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  aggregateMonthlyReport,
  buildMonthlyReport,
  type MonthlyReportV14,
} from "../aggregators/emrQcMonthlyReportV14Aggregator.js";

const sampleReports: MonthlyReportV14[] = [
  buildMonthlyReport("2026-01", 1000, 50),
  buildMonthlyReport("2026-02", 1200, 60),
  buildMonthlyReport("2026-03", 900, 45),
];

const aggregate = aggregateMonthlyReport(sampleReports);

export const emrQcMonthlyReportV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-monthly-report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-monthly-report:read");
      if (denied) return denied;
      return json(ok({ reports: sampleReports, aggregate }));
    },
  },
];
